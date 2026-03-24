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
import { scrapeEachUrlsServerFn, webSearchServerFn } from '#/data/items'
import type { BulkScrapeProgress } from '#/lib/types'
import { discoverSchema } from '#/schemas/import'
import type { SearchResultWeb } from '@mendable/firecrawl-js'
import { useForm } from '@tanstack/react-form'
import { createFileRoute } from '@tanstack/react-router'
import { Loader2, Search, Sparkles } from 'lucide-react'
import React from 'react'
import { toast } from 'sonner'

export const Route = createFileRoute('/dashboard/discover')({
  component: RouteComponent,
})

function RouteComponent() {
  const [isPending, startTransition] = React.useTransition()
  const [isBulkScrapingPending, startBulkScrapingTransition] =
    React.useTransition()
  const [webResults, setWebResults] = React.useState<SearchResultWeb[]>([])
  const [selectedUrls, setSelectedUrls] = React.useState<Set<string>>(new Set())
  const [progress, setProgress] = React.useState<BulkScrapeProgress | null>(
    null,
  )

  const form = useForm({
    defaultValues: {
      query: '',
    },
    validators: {
      onSubmit: discoverSchema,
    },
    onSubmit: ({ value }) => {
      startTransition(async () => {
        const results = await webSearchServerFn({ data: value })
        setWebResults(results)
      })
    },
  })

  const handleSelectAllUrls = () => {
    setSelectedUrls((prev) => {
      return prev.size === webResults.length
        ? new Set()
        : new Set(webResults.map((u) => u.url))
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
          <h1 className="text-3xl font-bold">Discover</h1>
          <p className="text-muted-foreground pt-2">
            Search the web for articles on any topic.
          </p>
        </div>

        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-3">
              <Sparkles className="size-5 text-primary" />
              Topic Search
            </CardTitle>
            <CardDescription>
              Search the web for content and import what you find interesting.
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-6">
            <form
              onSubmit={(e) => {
                e.preventDefault()
                form.handleSubmit()
              }}
            >
              <FieldGroup>
                <form.Field
                  name="query"
                  children={(field) => {
                    const isInvalid =
                      field.state.meta.isTouched && !field.state.meta.isValid
                    return (
                      <Field data-invalid={isInvalid}>
                        <FieldLabel htmlFor={field.name}>Search</FieldLabel>
                        <Input
                          id={field.name}
                          name={field.name}
                          value={field.state.value}
                          onBlur={field.handleBlur}
                          onChange={(e) => field.handleChange(e.target.value)}
                          aria-invalid={isInvalid}
                          placeholder="Eg: Tanstack Start Tutorial"
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
                      <Loader2 className="size-4 animate-spin" />
                      <span>Searching...</span>
                    </>
                  ) : (
                    <>
                      <Search />
                      <span>Search Web</span>
                    </>
                  )}
                </Button>
              </FieldGroup>
            </form>

            {webResults.length > 0 ? (
              <div className="space-y-4">
                <div className="flex items-center justify-between">
                  <p className="text-sm font-medium">
                    Found {webResults.length} URLs
                  </p>

                  <Button
                    size="sm"
                    variant="outline"
                    onClick={handleSelectAllUrls}
                  >
                    {selectedUrls.size === webResults.length
                      ? 'Deselect all'
                      : 'Select all'}
                  </Button>
                </div>

                <div className="max-h-80 space-y-2 overflow-y-auto rounded-md border p-4">
                  {webResults.map((link) => (
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
                        Importing {progress.completed} of {progress.total} URLs
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
                  disabled={selectedUrls.size === 0 || isBulkScrapingPending}
                >
                  {isBulkScrapingPending ? (
                    <>
                      <Loader2 className="animate-spin size-4" /> Processing...
                    </>
                  ) : (
                    `Import ${selectedUrls.size} URLs`
                  )}
                </Button>
              </div>
            ) : null}
          </CardContent>
        </Card>
      </div>
    </div>
  )
}
