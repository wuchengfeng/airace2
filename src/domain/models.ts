export type WordList = {
  id: string
  name: string
  createdAt: number
}

export type ListItemMaterial = {
  runId?: string
  sentence?: string
  sentenceZh?: string
  context?: {
    prevSentence: string
    nextSentence: string
    explanationZh?: string
    contextZh?: string
  }
  article?: {
    articleEn: string
    sentenceExplanationEn?: string
    articleZh?: string
  }
  finalReveal?: {
    articleZh: string
    termMeaningZh: string
  }
}

export type ListItem = {
  id: string
  term: string
  createdAt: number
  material?: ListItemMaterial
}

export type MistakeEntry = {
  id: string
  listId: string
  itemId: string
  term: string
  sentence: string
  wrongCount: number
  lastWrongAt: number
  snapshot?: {
    material?: ListItemMaterial
  }
}

export type CorrectEntry = {
  id: string
  listId: string
  itemId: string
  term: string
  sentence: string
  stage: 1 | 2 | 3
  correctCount: number
  lastCorrectAt: number
  snapshot?: {
    material?: ListItemMaterial
  }
}

export type PracticeMode = 'fixed_sequence' | 'ai_infinite' | 'fixed_random'

export type PromptRole = 'system' | 'user' | 'assistant'

export type PromptMessage = {
  role: PromptRole
  content: string
}

export type PromptTemplate = {
  messages: PromptMessage[]
}

export type PracticeProgress = {
  order: string[]
  cursor: number
  updatedAt: number
  mode?: PracticeMode
  run?: PracticeRun
}

export type PracticeRecord = {
  itemId: string
  term: string
  attemptCount: number // 1, 2, 3, or 4 (4 means failed)
  isCorrect: boolean
  userMeaningZh?: string
  snapshot?: ListItemMaterial
}

export type PracticeRun = {
  id: string
  startedAt: number
  endedAt?: number
  total: number
  correctByAttempt: {
    1: number
    2: number
    3: number
  }
  finalWrongCount: number
  records?: PracticeRecord[]
}

export type PracticeHistoryEntry = PracticeRun & {
  listId: string
  listName?: string
  mode: PracticeMode
}

export type UserSettings = {
  mode: PracticeMode
  selectedListId?: string
}

export type AppStateV1 = {
  version: 1
  lists: WordList[]
  itemsByListId: Record<string, ListItem[]>
  mistakes: MistakeEntry[]
  corrects?: CorrectEntry[]
  practiceByListId: Record<string, PracticeProgress>
  practiceHistory?: PracticeHistoryEntry[]
  settings?: UserSettings
  aiPrompts?: Record<string, PromptTemplate>
}
