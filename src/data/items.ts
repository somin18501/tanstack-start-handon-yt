import { prisma } from '#/db'
import { ItemStatus } from '#/generated/prisma/enums'
import { firecrawl } from '#/lib/firecrawl'
import { AI_MODEL_ID, openrouter } from '#/lib/openRouter'
import type { BulkScrapeProgress } from '#/lib/types'
import { authSessionFnMiddleware } from '#/middlewares/auth'
import {
  bulkImportSchema,
  discoverSchema,
  extractSchema,
  importSchema,
} from '#/schemas/import'
import type { SearchResultWeb } from '@mendable/firecrawl-js'
import { notFound } from '@tanstack/react-router'
import { createServerFn } from '@tanstack/react-start'
import { generateText } from 'ai'
import z from 'zod'

export const scrapeUrlServerFn = createServerFn({ method: 'POST' })
  .middleware([authSessionFnMiddleware])
  .inputValidator(importSchema)
  .handler(async ({ data, context }) => {
    const item = await prisma.savedItem.create({
      data: {
        url: data.url,
        userId: context.session.user.id,
        status: ItemStatus.PROCESSING,
      },
    })

    try {
      const result = await firecrawl.scrape(data.url, {
        formats: [
          'markdown',
          {
            type: 'json',
            // schema: extractSchema, // TODO: Zod v4 incompatible with Firecrawl SDK
            prompt: 'Extract the author and publishedAt from the page.', // NOTE: This is working as expected but using schema is more reliable
          },
        ],
        onlyMainContent: true, // NOTE: By default the scraper returns only the main content of the page, setting this to false will return the entire page content.
        location: { country: 'IN', languages: ['en'] },
        proxy: 'auto',
      })

      const jsonData = result.json as z.infer<typeof extractSchema>

      let publishedAt = null
      if (jsonData?.publishedAt) {
        const parsedDateTime = new Date(jsonData.publishedAt)

        if (!isNaN(parsedDateTime.getTime())) {
          publishedAt = parsedDateTime
        }
      }

      const updatedItem = await prisma.savedItem.update({
        where: {
          id: item.id,
        },
        data: {
          ogImage: result.metadata?.ogImage || null,
          title: result.metadata?.title || null,
          content: result.markdown || null,
          status: ItemStatus.COMPLETED,
          author: jsonData?.author || null,
          publishedAt,
        },
      })

      return updatedItem
    } catch (error) {
      console.error(error)
      const failedItem = await prisma.savedItem.update({
        where: {
          id: item.id,
        },
        data: {
          status: ItemStatus.FAILED,
        },
      })

      return failedItem
    }
  })

export const scrapeMapOfUrlsServerFn = createServerFn({ method: 'POST' })
  .middleware([authSessionFnMiddleware])
  .inputValidator(bulkImportSchema)
  .handler(async ({ data }) => {
    try {
      const result = await firecrawl.map(data.url, {
        limit: 25,
        search: data.search,
        location: { country: 'IN', languages: ['en'] },
      })
      return result.links
    } catch (error) {
      console.error(error)
      return []
    }
  })

export const scrapeEachUrlsServerFn = createServerFn({ method: 'POST' })
  .middleware([authSessionFnMiddleware])
  .inputValidator(z.object({ urls: z.array(z.url()) }))
  .handler(async function* ({ data, context }) {
    const total = data.urls.length

    const updatedItems = []

    for (let i = 0; i < data.urls.length; i++) {
      const url = data.urls[i]

      const item = await prisma.savedItem.create({
        data: {
          url,
          userId: context.session.user.id,
          status: ItemStatus.PROCESSING,
        },
      })

      let status: BulkScrapeProgress['status'] = 'success'

      try {
        const result = await firecrawl.scrape(url, {
          formats: [
            'markdown',
            {
              type: 'json',
              // schema: extractSchema, // TODO: Zod v4 incompatible with Firecrawl SDK
              prompt: 'Extract the author and publishedAt from the page.', // NOTE: This is working as expected but using schema is more reliable
            },
          ],
          onlyMainContent: true, // NOTE: By default the scraper returns only the main content of the page, setting this to false will return the entire page content.
          // location: { country: 'IN', languages: ['en'] }, // FIXME: This is not working, but working for single scrape above
          // proxy: 'auto', // FIXME: This is not working, but working for single scrape above
        })

        const jsonData = result.json as z.infer<typeof extractSchema>

        let publishedAt = null
        if (jsonData?.publishedAt) {
          const parsedDateTime = new Date(jsonData.publishedAt)

          if (!isNaN(parsedDateTime.getTime())) {
            publishedAt = parsedDateTime
          }
        }

        const updatedItem = await prisma.savedItem.update({
          where: {
            id: item.id,
          },
          data: {
            ogImage: result.metadata?.ogImage || null,
            title: result.metadata?.title || null,
            content: result.markdown || null,
            status: ItemStatus.COMPLETED,
            author: jsonData?.author || null,
            publishedAt,
          },
        })

        updatedItems.push(updatedItem)
      } catch (error) {
        status = 'failed'
        console.error(error)
        const failedItem = await prisma.savedItem.update({
          where: {
            id: item.id,
          },
          data: {
            status: ItemStatus.FAILED,
          },
        })

        updatedItems.push(failedItem)
      }

      const progress = {
        completed: i + 1,
        total,
        url,
        status,
      }

      yield progress
    }

    return updatedItems
  })

export const getItemsServerFn = createServerFn({ method: 'GET' })
  .middleware([authSessionFnMiddleware])
  .handler(async ({ context }) => {
    const items = await prisma.savedItem.findMany({
      where: {
        userId: context.session.user.id,
      },
      orderBy: {
        createdAt: 'desc',
      },
    })

    return items
  })

export const getItemServerFn = createServerFn({ method: 'GET' })
  .middleware([authSessionFnMiddleware])
  .inputValidator(z.object({ id: z.string() }))
  .handler(async ({ data, context }) => {
    const item = await prisma.savedItem.findUnique({
      where: {
        userId: context.session.user.id,
        id: data.id,
      },
    })

    if (!item) {
      throw notFound()
    }

    return item
  })

export const generateTagAndUpdateSummaryServerFn = createServerFn({
  method: 'POST',
})
  .middleware([authSessionFnMiddleware])
  .inputValidator(z.object({ itemId: z.string(), summary: z.string() }))
  .handler(async ({ data, context }) => {
    const item = await prisma.savedItem.findUnique({
      where: {
        userId: context.session.user.id,
        id: data.itemId,
      },
    })

    if (!item) {
      throw notFound()
    }

    try {
      const { text } = await generateText({
        model: openrouter.chat(AI_MODEL_ID),
        system: `You are a helpful assistant that extracts relevant tags from content summaries. Extract 3-5 short, relevant tags that categorize the content. Return ONLY a comma-separated list of tags, nothing else. Example: technology, programming, web development, javascript`,
        prompt: `Extract tags from this summary: \n\n${data.summary}`,
      })

      const tags = text
        .split(',')
        .map((tag) => tag.trim())
        .filter(Boolean)
        .slice(0, 5)

      const updatedItem = await prisma.savedItem.update({
        where: {
          id: data.itemId,
          userId: context.session.user.id,
        },
        data: {
          tags,
          summary: data.summary,
        },
      })

      return updatedItem
    } catch (error) {
      console.error(error)
      return item
    }
  })

export const webSearchServerFn = createServerFn({ method: 'POST' })
  .middleware([authSessionFnMiddleware])
  .inputValidator(discoverSchema)
  .handler(async ({ data }) => {
    try {
      const results = await firecrawl
        .search(data.query, {
          limit: 10,
          scrapeOptions: { formats: ['markdown'] },
          location: 'India',
          tbs: 'qdr:y', // Past year,
          // categories: ['github', 'pdf', 'research'], // NOTE: categories are used to filter results, default is empty array
          // sources: ['web'], // NOTE: 'web' is default, it also supports 'news', 'images'
        })
        .then((res) =>
          res.web?.map((web) => ({
            url: (web as SearchResultWeb).url,
            title: (web as SearchResultWeb).title,
            description: (web as SearchResultWeb).description,
          })),
        )
      return results || []
    } catch (error) {
      console.error(error)
      return []
    }
  })
