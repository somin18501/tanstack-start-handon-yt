import { createOpenRouter } from '@openrouter/ai-sdk-provider'

export const openrouter = createOpenRouter({
  apiKey: process.env.OPENROUTER_AI_PROVIDER_API_KEY,
})

export const AI_MODEL_ID = 'z-ai/glm-4.5-air:free' as const
