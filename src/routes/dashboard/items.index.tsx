import { Badge } from '#/components/ui/badge'
import { Button, buttonVariants } from '#/components/ui/button'
import {
  Card,
  CardDescription,
  CardHeader,
  CardTitle,
} from '#/components/ui/card'
import {
  Empty,
  EmptyContent,
  EmptyDescription,
  EmptyHeader,
  EmptyMedia,
  EmptyTitle,
} from '#/components/ui/empty'
import { Input } from '#/components/ui/input'
import {
  Select,
  SelectContent,
  SelectGroup,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '#/components/ui/select'
import { Skeleton } from '#/components/ui/skeleton'
import { getItemsServerFn } from '#/data/items'
import { ItemStatus } from '#/generated/prisma/enums'
import { copyToClipboard } from '#/lib/clipboard'
import { createFileRoute, Link, useNavigate } from '@tanstack/react-router'
import { zodValidator } from '@tanstack/zod-adapter'
import { Copy, Inbox } from 'lucide-react'
import React from 'react'
import z from 'zod'

const itemsSearchSchema = z.object({
  q: z.string().default(''),
  status: z.union([z.literal('all'), z.nativeEnum(ItemStatus)]).default('all'),
})

export const Route = createFileRoute('/dashboard/items/')({
  component: RouteComponent,
  loader: () => ({ itemsPromise: getItemsServerFn() }),
  validateSearch: zodValidator(itemsSearchSchema),
  head: () => ({
    meta: [
      {
        title: 'Items | Recall AI',
      },
      {
        property: 'og:title',
        content: 'Saved Items | Recall AI',
      },
    ],
  }),
})

const EmptyList: React.FC<
  React.PropsWithChildren<{ title: string; description?: string }>
> = ({ title, description, children }) => {
  return (
    <Empty className="border rounded-lg h-full">
      <EmptyHeader>
        <EmptyMedia variant="icon">
          <Inbox className="size-12" />
        </EmptyMedia>
        <EmptyTitle>{title}</EmptyTitle>
        {description ? (
          <EmptyDescription>{description}</EmptyDescription>
        ) : null}
      </EmptyHeader>
      {children ? <EmptyContent>{children}</EmptyContent> : null}
    </Empty>
  )
}

function ItemsGridSkeleton() {
  return (
    <div className="grid gap-6 md:grid-cols-2">
      {[1, 2, 3, 4].map((i) => (
        <Card key={i} className="overflow-hidden pt-0">
          <Skeleton className="aspect-video w-full" />
          <CardHeader className="space-y-3">
            <div className="flex items-center justify-between">
              <Skeleton className="h-5 w-20 rounded-full" />
              <Skeleton className="size-8 rounded-md" />
            </div>

            {/* Title */}
            <Skeleton className="h-6 w-full" />

            {/* Author  */}
            <Skeleton className="h-4 w-40" />
          </CardHeader>
        </Card>
      ))}
    </div>
  )
}

interface ItemsListProps extends z.infer<typeof itemsSearchSchema> {
  items: ReturnType<typeof getItemsServerFn>
}

const ItemsList: React.FC<ItemsListProps> = ({ items, q: keyword, status }) => {
  const itemsData = React.use(items)

  const filteredItems = React.useMemo(() => {
    return itemsData.filter((item) => {
      let matchesKeyword = true
      let matchesStatus = true

      if (keyword) {
        matchesKeyword =
          item.title?.toLowerCase().includes(keyword.toLowerCase()) ||
          item.tags.some((tag) =>
            tag.toLowerCase().includes(keyword.toLowerCase()),
          )
      }

      if (status !== 'all') {
        matchesStatus = item.status === status
      }

      return matchesKeyword && matchesStatus
    })
  }, [items, keyword, status])

  if (filteredItems.length === 0) {
    return (
      <EmptyList
        title={itemsData.length > 0 ? 'No items found' : 'No items saved'}
        description={
          itemsData.length > 0
            ? 'No items match your filter criteria'
            : 'Import a Url to get started with saving your content'
        }
      >
        {itemsData.length > 0 ? null : (
          <Link className={buttonVariants()} to="/dashboard/import">
            Import URL
          </Link>
        )}
      </EmptyList>
    )
  }

  return (
    <div className="grid gap-6 md:grid-cols-2">
      {filteredItems.map((item) => (
        <Card
          key={item.id}
          className="group overflow-hidden transition-all hover:shadow-lg pt-0"
        >
          <Link
            to="/dashboard/items/$itemId"
            params={{ itemId: item.id }}
            className="block"
          >
            <div className="aspect-video w-full overflow-hidden bg-muted">
              <img
                src={
                  item.ogImage ??
                  `https://api.dicebear.com/9.x/glass/svg?seed=${item.title ?? 'item'}`
                }
                alt={item.title ?? 'Untitled'}
                className="h-full w-full object-cover transition-transform group-hover:scale-105"
              />
            </div>

            <CardHeader className="space-y-3 pt-4">
              <div className="flex items-center justify-between gap-2">
                <Badge
                  variant={
                    item.status === ItemStatus.COMPLETED
                      ? 'default'
                      : 'secondary'
                  }
                >
                  {item.status.toLowerCase()}
                </Badge>
                <Button
                  size="icon"
                  variant="outline"
                  className="size-8"
                  onClick={async (e) => {
                    e.preventDefault()
                    await copyToClipboard(item.url)
                  }}
                >
                  <Copy className="size-4" />
                </Button>
              </div>
              <CardTitle className="line-clamp-1 text-xl leading-snug group-hover:text-primary transition-colors">
                {item.title}
              </CardTitle>
              {item.author ? (
                <p className="text-xs text-muted-foreground">{item.author}</p>
              ) : null}
              {item.summary ? (
                <CardDescription className="line-clamp-3">
                  {item.summary}
                </CardDescription>
              ) : null}
              {item.tags?.length > 0 ? (
                <div className="flex flex-wrap gap-1">
                  {item.tags.slice(0, 3).map((tag) => (
                    <Badge key={tag} variant="secondary">
                      {tag}
                    </Badge>
                  ))}
                </div>
              ) : null}
            </CardHeader>
          </Link>
        </Card>
      ))}
    </div>
  )
}

function RouteComponent() {
  const { itemsPromise } = Route.useLoaderData()
  const searchParams = Route.useSearch()
  const navigate = useNavigate({ from: Route.fullPath })

  const [keyword, setKeyword] = React.useState(searchParams.q)

  React.useEffect(() => {
    if (searchParams.q === keyword) return

    const timeOutId = setTimeout(() => {
      navigate({
        search: (prev) => ({ ...prev, q: keyword }),
      })
    }, 500)

    return () => {
      clearTimeout(timeOutId)
    }
  }, [keyword, searchParams.q, navigate])

  return (
    <div className="flex flex-1 flex-col gap-6">
      <div>
        <h1 className="text-2xl font-bold">Saved Items</h1>
        <p className="text-muted-foreground">
          Your saved articles and content!
        </p>
      </div>
      <div className="flex gap-4">
        <Input
          value={keyword}
          placeholder="Search by title or tags"
          onChange={(e) => setKeyword(e.target.value)}
        />
        <Select
          value={searchParams.status}
          onValueChange={(value: typeof searchParams.status) =>
            navigate({
              search: (prev) => ({
                ...prev,
                status: value,
              }),
            })
          }
        >
          <SelectTrigger className="w-[160px]">
            <SelectValue placeholder="Filter by status" />
          </SelectTrigger>
          <SelectContent>
            <SelectGroup>
              <SelectItem value="all">All</SelectItem>
              {Object.values(ItemStatus).map((status) => (
                <SelectItem key={status} value={status}>
                  {status.charAt(0) + status.slice(1).toLowerCase()}
                </SelectItem>
              ))}
            </SelectGroup>
          </SelectContent>
        </Select>
      </div>

      <React.Suspense fallback={<ItemsGridSkeleton />}>
        <ItemsList
          q={searchParams.q}
          items={itemsPromise}
          status={searchParams.status}
        />
      </React.Suspense>
    </div>
  )
}
