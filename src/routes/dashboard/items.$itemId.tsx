import { MessageResponse } from '#/components/ai-elements/message'
import { Badge } from '#/components/ui/badge'
import { Button, buttonVariants } from '#/components/ui/button'
import { Card, CardContent } from '#/components/ui/card'
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from '#/components/ui/collapsible'
import {
  generateTagAndUpdateSummaryServerFn,
  getItemServerFn,
} from '#/data/items'
import { cn } from '#/lib/utils'
import { useCompletion } from '@ai-sdk/react'
import { createFileRoute, Link, useRouter } from '@tanstack/react-router'
import {
  ArrowLeft,
  Calendar,
  ChevronDown,
  Clock,
  ExternalLink,
  Loader2,
  Sparkles,
  User,
} from 'lucide-react'
import React from 'react'
import { toast } from 'sonner'

export const Route = createFileRoute('/dashboard/items/$itemId')({
  component: RouteComponent,
  loader: async ({ params }) =>
    getItemServerFn({ data: { id: params.itemId } }),
  head: ({ loaderData }) => ({
    meta: [
      {
        title: loaderData?.title ?? 'Item | Recall AI',
      },
      {
        property: 'og:image',
        content: loaderData?.ogImage ?? '',
      },
      {
        name: 'twitter:description',
        content: loaderData?.title ?? 'Item | Recall AI',
      },
    ],
  }),
})

function RouteComponent() {
  const item = Route.useLoaderData()
  const router = useRouter()

  const [isContentOpen, setIsContentOpen] = React.useState(false)
  const { completion, complete, isLoading } = useCompletion({
    initialCompletion: item.summary || undefined,
    api: '/api/ai/summary',
    streamProtocol: 'text',
    body: {
      itemId: item.id,
    },
    onFinish: async (_prompt, completionText = '') => {
      await generateTagAndUpdateSummaryServerFn({
        data: {
          itemId: item.id,
          summary: completionText,
        },
      })

      toast.success('Summary generated and saved successfully!')
      router.invalidate()
    },
    onError: (error) => {
      toast.error(error.message)
    },
  })

  const getSummary = () => {
    if (!item.content) {
      toast.error('No content to summarize')
      return
    }

    complete(item.content)
  }

  return (
    <div className="mx-auto space-y-6 w-full">
      <div className="flex justify-start">
        <Link
          to="/dashboard/items"
          className={buttonVariants({ variant: 'outline' })}
        >
          <ArrowLeft />
          Back to items
        </Link>
      </div>

      <div className="relative aspect-video w-full overflow-hidden rounded-lg bg-muted">
        <img
          src={
            item.ogImage ??
            `https://api.dicebear.com/9.x/glass/svg?seed=${item.title ?? 'item'}`
          }
          alt={item.title ?? 'Item image'}
          className="w-full h-full object-cover transition-transform duration-300 hover:scale-105"
        />
      </div>

      <div className="space-y-3">
        <h1 className="text-3xl font-bold tracking-tight">
          {item.title ?? 'Untitled'}
        </h1>

        <div className="flex flex-wrap items-center gap-4 text-sm text-muted-foreground">
          {item.author ? (
            <span className="inline-flex items-center gap-1">
              <User className="size-3.5" />
              {item.author}
            </span>
          ) : null}

          {item.publishedAt ? (
            <span className="inline-flex items-center gap-1">
              <Calendar className="size-3.5" />
              {new Date(item.publishedAt).toLocaleDateString()}
            </span>
          ) : null}

          <span className="inline-flex items-center gap-1">
            <Clock className="size-3.5" />
            {new Date(item.createdAt).toLocaleDateString()}
          </span>
        </div>

        <a
          href={item.url}
          target="_blank"
          className={buttonVariants({ variant: 'outline' })}
        >
          View <ExternalLink className="size-4" />
        </a>

        {item.tags?.length > 0 ? (
          <div className="flex flex-wrap gap-2">
            {item.tags.map((tag) => (
              <Badge key={tag}>{tag}</Badge>
            ))}
          </div>
        ) : null}

        <Card className="border-primary/20 bg-primary/5">
          <CardContent>
            <div className="flex items-start justify-between gap-4">
              <div className="flex-1">
                <h2 className="text-sm font-semibold uppercase tracking-wide text-primary mb-3">
                  Summary
                </h2>
                {completion ? (
                  <MessageResponse className="text-sm text-muted-foreground">
                    {completion}
                  </MessageResponse>
                ) : (
                  <p className="italic text-muted-foreground">
                    {item.content
                      ? 'No summary yet, generate on with AI'
                      : 'No content available to summarize'}
                  </p>
                )}
              </div>

              {item.content && !item.summary ? (
                <Button disabled={isLoading} size="sm" onClick={getSummary}>
                  {isLoading ? (
                    <>
                      <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                      Generating...
                    </>
                  ) : (
                    <>
                      <Sparkles className="mr-2 h-4 w-4" />
                      Generate Summary
                    </>
                  )}
                </Button>
              ) : null}
            </div>
          </CardContent>
        </Card>

        {item.content ? (
          <Collapsible open={isContentOpen} onOpenChange={setIsContentOpen}>
            <CollapsibleTrigger asChild>
              <Button variant="outline" className="w-full justify-between">
                <span className="font-medium">Full content</span>
                <ChevronDown
                  className={cn(
                    { 'rotate-180': isContentOpen },
                    'size-4 transition-transform duration-200',
                  )}
                />
              </Button>
            </CollapsibleTrigger>
            <CollapsibleContent>
              <Card className="mt-2">
                <CardContent>
                  <MessageResponse>{item.content}</MessageResponse>
                </CardContent>
              </Card>
            </CollapsibleContent>
          </Collapsible>
        ) : null}
      </div>
    </div>
  )
}
