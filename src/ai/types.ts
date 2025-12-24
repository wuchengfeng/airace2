export type JudgeMeaningInput = {
  term: string
  sentence: string
  prompts?: Record<string, { messages: { role: 'system' | 'user' | 'assistant'; content: string }[] }>
  material: {
    prevSentence?: string
    nextSentence?: string
    articleEn?: string
    sentenceExplanationEn?: string
  }
  userMeaningZh: string
}

export type JudgeMeaningOutput = {
  isCorrect: boolean
  score?: number
  confidence?: number
  reason?: string
  correctMeaningZh?: string
  acceptAlternatives?: string[]
}

export type GenerateContextInput = {
  term: string
  sentence: string
  prompts?: Record<string, { messages: { role: 'system' | 'user' | 'assistant'; content: string }[] }>
}

export type GenerateContextOutput = {
  prevSentence: string
  nextSentence: string
  explanationZh?: string
  contextZh?: string
}

export type GenerateArticleInput = {
  term: string
  sentence: string
  prevSentence?: string
  nextSentence?: string
  prompts?: Record<string, { messages: { role: 'system' | 'user' | 'assistant'; content: string }[] }>
}

export type GenerateArticleOutput = {
  articleEn: string
  sentenceExplanationEn?: string
  articleZh?: string
}

export type FinalRevealInput = {
  term: string
  sentence: string
  articleEn: string
  sentenceExplanationEn?: string
  prompts?: Record<string, { messages: { role: 'system' | 'user' | 'assistant'; content: string }[] }>
}

export type GenerateSentenceInput = {
  term: string
  prompts?: Record<string, { messages: { role: 'system' | 'user' | 'assistant'; content: string }[] }>
}

export type GenerateSentenceOutput = {
  sentence: string
  sentenceZh?: string
}

export type TranslateSentenceZhInput = {
  term: string
  sentence: string
  prompts?: Record<string, { messages: { role: 'system' | 'user' | 'assistant'; content: string }[] }>
}

export type TranslateSentenceZhOutput = {
  sentenceZh: string
}

export type FinalRevealOutput = {
  articleZh: string
  termMeaningZh: string
}

export type AiProvider = {
  generateSentence: (input: GenerateSentenceInput) => Promise<GenerateSentenceOutput>
  translateSentenceZh: (input: TranslateSentenceZhInput) => Promise<TranslateSentenceZhOutput>
  judgeMeaning: (input: JudgeMeaningInput) => Promise<JudgeMeaningOutput>
  generateContext: (input: GenerateContextInput) => Promise<GenerateContextOutput>
  generateArticle: (input: GenerateArticleInput) => Promise<GenerateArticleOutput>
  finalReveal: (input: FinalRevealInput) => Promise<FinalRevealOutput>
}
