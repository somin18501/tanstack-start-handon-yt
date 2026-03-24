// src/start.ts
import { authSessionReqMiddleware } from '#/middlewares/auth'
import { createMiddleware, createStart } from '@tanstack/react-start'

const myGlobalLoggingMiddleware = createMiddleware({ type: 'request' }).server(
  ({ request, next }) => {
    const url = new URL(request.url)
    console.log(`${request.method} : ${url.pathname}`)
    return next()
  },
)

export const startInstance = createStart(() => {
  return {
    requestMiddleware: [myGlobalLoggingMiddleware, authSessionReqMiddleware],
  }
})
