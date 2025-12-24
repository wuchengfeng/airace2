import { mockAiProvider } from './mockProvider'
import { userAiProvider } from './userProvider'
import type { AiProvider } from './types'

const provider: AiProvider = import.meta.env.VITE_AI_PROVIDER === 'user' ? userAiProvider : mockAiProvider

export const aiProvider = provider
export { userAiProvider }
