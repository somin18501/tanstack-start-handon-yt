import { Button } from '#/components/ui/button'
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '#/components/ui/card'
import { Checkbox } from '#/components/ui/checkbox'
import {
  Field,
  FieldError,
  FieldGroup,
  FieldLabel,
} from '#/components/ui/field'
import { Input } from '#/components/ui/input'
import { Progress } from '#/components/ui/progress'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '#/components/ui/tabs'
import {
  scrapeEachUrlsServerFn,
  scrapeMapOfUrlsServerFn,
  scrapeUrlServerFn,
} from '#/data/items'
import { ItemStatus } from '#/generated/prisma/enums'
import type { BulkScrapeProgress } from '#/lib/types'
import { bulkImportSchema, importSchema } from '#/schemas/import'
import type { SearchResultWeb } from '@mendable/firecrawl-js'
import { useForm } from '@tanstack/react-form'
import { createFileRoute } from '@tanstack/react-router'
import { Globe, LinkIcon, Loader2 } from 'lucide-react'
import React from 'react'
import { toast } from 'sonner'

export const Route = createFileRoute('/dashboard/import')({
  component: RouteComponent,
})

function RouteComponent() {
  const [isPending, startTransition] = React.useTransition()
  const [isBulkScrapingPending, startBulkScrapingTransition] =
    React.useTransition()

  const [discoverdUrls, setDiscoverdUrls] = React.useState<SearchResultWeb[]>(
    [],
  )
  const [selectedUrls, setSelectedUrls] = React.useState<Set<string>>(new Set())
  const [progress, setProgress] = React.useState<BulkScrapeProgress | null>(
    null,
  )

  const importForm = useForm({
    defaultValues: {
      url: '',
    },
    validators: {
      onSubmit: importSchema,
    },
    onSubmit: ({ value }) => {
      startTransition(async () => {
        const item = await scrapeUrlServerFn({ data: value })
        if (item.status === ItemStatus.COMPLETED) {
          toast.success('Url scraped successfully!')
        } else {
          toast.error('Url scraping failed!')
        }
      })
    },
  })

  const bulkImportForm = useForm({
    defaultValues: {
      url: '',
      search: '',
    },
    validators: {
      onSubmit: bulkImportSchema,
    },
    onSubmit: ({ value }) => {
      startTransition(async () => {
        const result = await scrapeMapOfUrlsServerFn({ data: value })
        setDiscoverdUrls(result)
      })
    },
  })

  const handleSelectAllUrls = () => {
    setSelectedUrls((prev) => {
      return prev.size === discoverdUrls.length
        ? new Set()
        : new Set(discoverdUrls.map((u) => u.url))
    })
  }

  const toggleUrlSelection = (url: string) => {
    setSelectedUrls((prev) => {
      const next = new Set(prev)
      if (next.has(url)) {
        next.delete(url)
      } else {
        next.add(url)
      }
      return next
    })
  }

  const handleImportSelectedUrls = () => {
    if (!selectedUrls.size) {
      toast.error('None of the urls are selected for import!')
      return
    }

    startBulkScrapingTransition(async () => {
      setProgress({
        completed: 0,
        total: selectedUrls.size,
        url: '',
        status: 'success',
      })

      let successCnt = 0
      let failedCnt = 0
      const urls = Array.from(selectedUrls)
      const generator = await scrapeEachUrlsServerFn({ data: { urls } })

      for await (const update of generator) {
        setProgress(update)

        if (update.status === 'success') {
          successCnt++
        } else {
          failedCnt++
        }
      }

      setProgress(null)
      toast.success(
        `${successCnt} urls scraped successfully! with ${failedCnt} urls failing`,
      )
    })
  }

  return (
    <div className="flex flex-1 items-center justify-center py-8">
      <div className="w-full max-w-2xl space-y-6 px-4">
        <div className="text-center">
          <h1 className="text-3xl font-bold">Import</h1>
          <p className="text-muted-foreground pt-1">
            Save web pages for your library for later reading
          </p>
        </div>

        <Tabs defaultValue="single">
          <TabsList className="grid w-full grid-cols-2">
            <TabsTrigger value="single" className="gap-2">
              <LinkIcon className="size-4" /> Single URL
            </TabsTrigger>
            <TabsTrigger value="bulk" className="gap-2">
              <Globe className="size-4" /> Bulk Import
            </TabsTrigger>
          </TabsList>

          <TabsContent value="single">
            <Card>
              <CardHeader>
                <CardTitle>Import Single URL</CardTitle>
                <CardDescription>
                  Scrape and save content from any web app!
                </CardDescription>
              </CardHeader>
              <CardContent>
                <form
                  onSubmit={(e) => {
                    e.preventDefault()
                    importForm.handleSubmit()
                  }}
                >
                  <FieldGroup>
                    <importForm.Field
                      name="url"
                      children={(field) => {
                        const isInvalid =
                          field.state.meta.isTouched &&
                          !field.state.meta.isValid
                        return (
                          <Field data-invalid={isInvalid}>
                            <FieldLabel htmlFor={field.name}>URL</FieldLabel>
                            <Input
                              id={field.name}
                              name={field.name}
                              value={field.state.value}
                              onBlur={field.handleBlur}
                              onChange={(e) =>
                                field.handleChange(e.target.value)
                              }
                              aria-invalid={isInvalid}
                              type="url"
                              placeholder="https://example.com"
                              autoComplete="off"
                            />
                            {isInvalid && (
                              <FieldError errors={field.state.meta.errors} />
                            )}
                          </Field>
                        )
                      }}
                    />
                    <Button disabled={isPending} type="submit">
                      {isPending ? (
                        <>
                          <Loader2 className="animate-spin size-4" />{' '}
                          Processing...
                        </>
                      ) : (
                        'Import Url'
                      )}
                    </Button>
                  </FieldGroup>
                </form>
              </CardContent>
            </Card>
          </TabsContent>
          <TabsContent value="bulk">
            <Card>
              <CardHeader>
                <CardTitle>Bulk Import</CardTitle>
                <CardDescription>
                  Discover and import multiple URLs from a website at once!!
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-6">
                <form
                  onSubmit={(e) => {
                    e.preventDefault()
                    bulkImportForm.handleSubmit()
                  }}
                >
                  <FieldGroup>
                    <bulkImportForm.Field
                      name="url"
                      children={(field) => {
                        const isInvalid =
                          field.state.meta.isTouched &&
                          !field.state.meta.isValid
                        return (
                          <Field data-invalid={isInvalid}>
                            <FieldLabel htmlFor={field.name}>URL</FieldLabel>
                            <Input
                              id={field.name}
                              name={field.name}
                              value={field.state.value}
                              onBlur={field.handleBlur}
                              onChange={(e) =>
                                field.handleChange(e.target.value)
                              }
                              aria-invalid={isInvalid}
                              type="url"
                              placeholder="https://example.com"
                              autoComplete="off"
                            />
                            {isInvalid && (
                              <FieldError errors={field.state.meta.errors} />
                            )}
                          </Field>
                        )
                      }}
                    />
                    <bulkImportForm.Field
                      name="search"
                      children={(field) => {
                        const isInvalid =
                          field.state.meta.isTouched &&
                          !field.state.meta.isValid
                        return (
                          <Field data-invalid={isInvalid}>
                            <FieldLabel htmlFor={field.name}>
                              Filter (optional)
                            </FieldLabel>
                            <Input
                              id={field.name}
                              name={field.name}
                              value={field.state.value}
                              onBlur={field.handleBlur}
                              onChange={(e) =>
                                field.handleChange(e.target.value)
                              }
                              aria-invalid={isInvalid}
                              placeholder="e.g. Blog, docs, tutorial"
                              autoComplete="off"
                            />
                            {isInvalid && (
                              <FieldError errors={field.state.meta.errors} />
                            )}
                          </Field>
                        )
                      }}
                    />
                    <Button
                      disabled={isPending || isBulkScrapingPending}
                      type="submit"
                    >
                      {isPending ? (
                        <>
                          <Loader2 className="animate-spin size-4" />{' '}
                          Processing...
                        </>
                      ) : (
                        'Import Urls'
                      )}
                    </Button>
                  </FieldGroup>
                </form>

                {discoverdUrls.length > 0 ? (
                  <div className="space-y-4">
                    <div className="flex items-center justify-between">
                      <p className="text-sm font-medium">
                        Found {discoverdUrls.length} URLs
                      </p>

                      <Button
                        size="sm"
                        variant="outline"
                        onClick={handleSelectAllUrls}
                      >
                        {selectedUrls.size === discoverdUrls.length
                          ? 'Deselect all'
                          : 'Select all'}
                      </Button>
                    </div>

                    <div className="max-h-80 space-y-2 overflow-y-auto rounded-md border p-4">
                      {discoverdUrls.map((link) => (
                        <label
                          key={link.url}
                          className="hover:bg-muted/50 flex cursor-pointer items-center gap-3 rounded-md p-2"
                        >
                          <Checkbox
                            id={link.url}
                            className="mt-0.5"
                            checked={selectedUrls.has(link.url)}
                            onCheckedChange={() => toggleUrlSelection(link.url)}
                          />
                          <div className="min-w-0 flex-1">
                            <p className="truncate text-sm font-medium">
                              {link.title ?? 'Untitled'}
                            </p>
                            <p className="text-xs text-muted-foreground truncate">
                              {link.description ?? 'No description'}
                            </p>
                            <p className="text-xs text-muted-foreground truncate">
                              {link.url}
                            </p>
                          </div>
                        </label>
                      ))}
                    </div>

                    {progress ? (
                      <div className="space-y-2">
                        <div className="flex items-center justify-between text-sm">
                          <span className="text-muted-foreground">
                            Importing {progress.completed} of {progress.total}{' '}
                            URLs
                          </span>
                          <span>
                            {Math.round(
                              (progress.completed / progress.total) * 100,
                            )}
                            %
                          </span>
                        </div>
                        <Progress
                          value={(progress.completed / progress.total) * 100}
                        />
                        <p className="text-xs text-muted-foreground">
                          Currently scraping: {progress.url}
                        </p>
                      </div>
                    ) : null}

                    <Button
                      className="w-full"
                      onClick={handleImportSelectedUrls}
                      disabled={
                        selectedUrls.size === 0 || isBulkScrapingPending
                      }
                    >
                      {isBulkScrapingPending ? (
                        <>
                          <Loader2 className="animate-spin size-4" />{' '}
                          Processing...
                        </>
                      ) : (
                        `Import ${selectedUrls.size} URLs`
                      )}
                    </Button>
                  </div>
                ) : (
                  <p className="text-xs text-muted-foreground text-center">
                    No urls discovered yet. Enter a url above to get started.
                  </p>
                )}
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>
      </div>
    </div>
  )
}
