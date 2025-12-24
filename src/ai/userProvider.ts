import type { AiProvider } from './types'

type Role = 'system' | 'user' | 'assistant'

type ChatMessage = { role: Role; content: string }

type JudgeMeaningResponse = {
  isCorrect?: unknown
  score?: unknown
  confidence?: unknown
  reason?: unknown
  correctMeaningZh?: unknown
  acceptAlternatives?: unknown
}

type Stage2ContextResponse = {
  prevSentence?: unknown
  nextSentence?: unknown
  explanationZh?: unknown
  contextZh?: unknown
}

type Stage3ArticleResponse = {
  articleEn?: unknown
  sentenceExplanationEn?: unknown
  articleZh?: unknown
}

type Stage4FinalResponse = {
  articleZh?: unknown
  termMeaningZh?: unknown
}

function getEnv(key: string) {
  const env = import.meta.env as unknown as Record<string, string | undefined>
  const v = env[key]
  return typeof v === 'string' && v.trim().length > 0 ? v.trim() : undefined
}

function renderVars(text: string, vars: Record<string, string | undefined>) {
  return text.replace(/\{\{\s*([a-zA-Z0-9_]+)\s*\}\}/g, (_m, k) => {
    const v = vars[k]
    return typeof v === 'string' ? v : ''
  })
}

function buildMessages(template: { messages: ChatMessage[] }, vars: Record<string, string | undefined>) {
  return template.messages.map((m) => ({ role: m.role, content: renderVars(m.content, vars) }))
}

function tryExtractJson(text: string) {
  const start = text.indexOf('{')
  const end = text.lastIndexOf('}')
  if (start >= 0 && end > start) return text.slice(start, end + 1)
  return text
}

function parseJson<T>(text: string): T {
  const trimmed = text.trim()
  try {
    return JSON.parse(trimmed) as T
  } catch {
    const extracted = tryExtractJson(trimmed)
    return JSON.parse(extracted) as T
  }
}

async function chatCompletion(messages: ChatMessage[]) {
  const appId = getEnv('VITE_TAL_MLOPS_APP_ID')
  const appKey = getEnv('VITE_TAL_MLOPS_APP_KEY')
  const url = getEnv('VITE_TAL_AI_BASE_URL') ?? '/tal-ai/openai-compatible/v1/chat/completions'
  const model = getEnv('VITE_TAL_AI_MODEL') ?? 'gpt-4.1'

  const res = await fetch(url, {
    method: 'POST',
    headers: {
      ...(appId && appKey ? { Authorization: `Bearer ${appId}:${appKey}` } : {}),
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      model,
      messages,
      temperature: 0.2,
    }),
  })

  if (!res.ok) {
    const body = await res.text().catch(() => '')
    throw new Error(`AI request failed: ${res.status} ${res.statusText}${body ? ` · ${body}` : ''}`)
  }

  const json = (await res.json()) as unknown
  const content = (json as { choices?: Array<{ message?: { content?: unknown } }> })?.choices?.[0]?.message?.content
  if (typeof content !== 'string') throw new Error('AI response missing content')
  return content
}

export const userAiProvider: AiProvider = {
  async generateSentence(input) {
    const template = input.prompts?.stage1_sentence
    if (!template) throw new Error('Missing prompt: stage1_sentence')
    const content = await chatCompletion(buildMessages(template as { messages: ChatMessage[] }, { term: input.term }))
    try {
      const parsed = parseJson<{ sentence?: string; sentenceZh?: string }>(content)
      const sentence = typeof parsed.sentence === 'string' ? parsed.sentence.trim() : ''
      const sentenceZh = typeof parsed.sentenceZh === 'string' ? parsed.sentenceZh.trim() : undefined
      if (sentence) return { sentence, sentenceZh }
    } catch {
      const sentence = content.trim()
      if (sentence) return { sentence }
    }
    throw new Error('Invalid stage1_sentence output')
  },
  async translateSentenceZh(input) {
    const messages: ChatMessage[] = [
      {
        role: 'system',
        content:
          'You translate English sentences into Chinese. Keep the specific term exactly as the original English (do NOT translate that term). Output strictly in JSON.',
      },
      {
        role: 'user',
        content:
          'Translate the sentence to Chinese, keeping the term unchanged:\nTerm: "{{term}}"\nSentence: "{{sentence}}"\nReturn JSON: {"sentenceZh":"..."}',
      },
    ]
    const content = await chatCompletion(buildMessages({ messages }, { term: input.term, sentence: input.sentence }))
    const parsed = parseJson<{ sentenceZh?: string }>(content)
    const sentenceZh = typeof parsed.sentenceZh === 'string' ? parsed.sentenceZh.trim() : ''
    if (!sentenceZh) throw new Error('Invalid translation output')
    return { sentenceZh }
  },
  async judgeMeaning(input) {
    const template = input.prompts?.judge_meaning
    if (!template) throw new Error('Missing prompt: judge_meaning')
    const content = await chatCompletion(
      buildMessages(template as { messages: ChatMessage[] }, {
        term: input.term,
        sentence: input.sentence,
        prevSentence: input.material.prevSentence,
        nextSentence: input.material.nextSentence,
        articleEn: input.material.articleEn,
        userMeaningZh: input.userMeaningZh,
      }),
    )
    try {
      const parsed = parseJson<JudgeMeaningResponse>(content)
      const scoreRaw = parsed.score
      const score =
        typeof scoreRaw === 'number'
          ? Math.max(0, Math.min(100, Math.round(scoreRaw)))
          : typeof scoreRaw === 'string' && scoreRaw.trim().length > 0
            ? Math.max(0, Math.min(100, Math.round(Number(scoreRaw))))
            : undefined
      const isCorrect = typeof score === 'number' ? score >= 80 : Boolean(parsed.isCorrect)
      return {
        isCorrect,
        score,
        confidence: typeof parsed.confidence === 'number' ? parsed.confidence : undefined,
        reason: typeof parsed.reason === 'string' ? parsed.reason : undefined,
        correctMeaningZh: typeof parsed.correctMeaningZh === 'string' ? parsed.correctMeaningZh : undefined,
        acceptAlternatives: Array.isArray(parsed.acceptAlternatives) ? parsed.acceptAlternatives.filter((v) => typeof v === 'string') : undefined,
      }
    } catch {
      const trimmed = content.trim()
      return { isCorrect: /true/i.test(trimmed), reason: trimmed }
    }
  },
  async generateContext(input) {
    const template = input.prompts?.stage2_context
    if (!template) throw new Error('Missing prompt: stage2_context')
    const content = await chatCompletion(buildMessages(template as { messages: ChatMessage[] }, { term: input.term, sentence: input.sentence }))
    try {
      const parsed = parseJson<Stage2ContextResponse>(content)
      const prevSentence = typeof parsed.prevSentence === 'string' ? parsed.prevSentence : ''
      const nextSentence = typeof parsed.nextSentence === 'string' ? parsed.nextSentence : ''
      const explanationZh = typeof parsed.explanationZh === 'string' ? parsed.explanationZh : undefined
      const contextZh = typeof parsed.contextZh === 'string' ? parsed.contextZh : undefined
      
      // Return whatever we managed to parse, even if some fields are missing
      return { prevSentence, nextSentence, explanationZh, contextZh }
    } catch {
      return { prevSentence: '', nextSentence: '', explanationZh: content.trim() }
    }
    return { prevSentence: '', nextSentence: '', explanationZh: content.trim() }
  },
  async generateArticle(input) {
    const template = input.prompts?.stage3_article
    if (!template) throw new Error('Missing prompt: stage3_article')
    const content = await chatCompletion(
      buildMessages(template as { messages: ChatMessage[] }, {
        term: input.term,
        sentence: input.sentence,
        prevSentence: input.prevSentence ?? '',
        nextSentence: input.nextSentence ?? '',
      }),
    )
    const parsed = parseJson<Stage3ArticleResponse>(content)
    const articleEn = typeof parsed.articleEn === 'string' ? parsed.articleEn : ''
    const articleZh = typeof parsed.articleZh === 'string' ? parsed.articleZh : undefined
    // sentenceExplanationEn is no longer required/generated
    if (!articleEn) throw new Error('Invalid stage3_article output')
    return { articleEn, articleZh }
  },
  async finalReveal(input) {
    const template = input.prompts?.stage4_final
    if (!template) throw new Error('Missing prompt: stage4_final')
    const content = await chatCompletion(
      buildMessages(template as { messages: ChatMessage[] }, {
        term: input.term,
        sentence: input.sentence,
        articleEn: input.articleEn,
        sentenceExplanationEn: input.sentenceExplanationEn ?? '',
      }),
    )
    const parsed = parseJson<Stage4FinalResponse>(content)
    const articleZh = typeof parsed.articleZh === 'string' ? parsed.articleZh : ''
    const termMeaningZh = typeof parsed.termMeaningZh === 'string' ? parsed.termMeaningZh : ''
    if (!articleZh || !termMeaningZh) throw new Error('Invalid stage4_final output')
    return { articleZh, termMeaningZh }
  },
}
