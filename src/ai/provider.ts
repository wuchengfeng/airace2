import { mockAiProvider } from './mockProvider'
import { userAiProvider } from './userProvider'
import { volcesAiProvider } from './volcesProvider'
import type { AiProvider } from './types'

const providerName = (import.meta.env.VITE_AI_PROVIDER ?? '').trim().toLowerCase()
const provider: AiProvider =
  providerName === 'user' ? userAiProvider : providerName === 'volces' ? volcesAiProvider : mockAiProvider

export const aiProvider = provider
export { userAiProvider }
