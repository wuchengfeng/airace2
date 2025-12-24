import type { AiProvider } from './types'

type Role = 'system' | 'user' | 'assistant'
type ChatMessage = { role: Role; content: string }

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
  const apiKey = getEnv('VITE_VOLCES_ARK_API_KEY')
  const url = getEnv('VITE_VOLCES_ARK_BASE_URL') ?? 'https://ark.cn-beijing.volces.com/api/v3/chat/completions'
  const model = getEnv('VITE_VOLCES_ARK_MODEL') ?? 'doubao-seed-1-6-251015'
  const bodyMessages = messages.map((m) => ({
    role: m.role,
    content: [{ type: 'text', text: m.content }],
  }))
  const res = await fetch(url, {
    method: 'POST',
    headers: {
      ...(apiKey ? { Authorization: `Bearer ${apiKey}` } : {}),
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      model,
      messages: bodyMessages,
      max_completion_tokens: 4096,
      reasoning_effort: 'medium',
    }),
  })
  if (!res.ok) {
    const body = await res.text().catch(() => '')
    throw new Error(`AI request failed: ${res.status} ${res.statusText}${body ? ` · ${body}` : ''}`)
  }
  const json = (await res.json()) as unknown
  let content: unknown = undefined
  const choices = (json as { choices?: unknown }).choices
  if (Array.isArray(choices)) {
    const msg = (choices as Array<{ message?: unknown }>)[0]?.message as { content?: unknown }
    const msgContent = msg?.content
    if (typeof msgContent === 'string') {
      content = msgContent
    } else if (Array.isArray(msgContent)) {
      const arr = msgContent as Array<{ type?: string; text?: string }>
      const textPiece = arr.find((p) => typeof p?.text === 'string')?.text
      if (typeof textPiece === 'string') content = textPiece
    }
  }
  const outputText = (json as { output_text?: unknown }).output_text
  if (!content && typeof outputText === 'string') content = outputText
  if (typeof content !== 'string') throw new Error('AI response missing content')
  return content
}

export const volcesAiProvider: AiProvider = {
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
      const parsed = parseJson<{ isCorrect?: unknown; score?: unknown; confidence?: unknown; reason?: unknown; correctMeaningZh?: unknown; acceptAlternatives?: unknown }>(content)
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
        acceptAlternatives: Array.isArray(parsed.acceptAlternatives) ? (parsed.acceptAlternatives as unknown[]).filter((v) => typeof v === 'string') as string[] : undefined,
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
      const parsed = parseJson<{ prevSentence?: unknown; nextSentence?: unknown; explanationZh?: unknown; contextZh?: unknown }>(content)
      const prevSentence = typeof parsed.prevSentence === 'string' ? parsed.prevSentence : ''
      const nextSentence = typeof parsed.nextSentence === 'string' ? parsed.nextSentence : ''
      const explanationZh = typeof parsed.explanationZh === 'string' ? parsed.explanationZh : undefined
      const contextZh = typeof parsed.contextZh === 'string' ? parsed.contextZh : undefined
      return { prevSentence, nextSentence, explanationZh, contextZh }
    } catch {
      return { prevSentence: '', nextSentence: '', explanationZh: content.trim() }
    }
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
    const parsed = parseJson<{ articleEn?: unknown; sentenceExplanationEn?: unknown; articleZh?: unknown }>(content)
    const articleEn = typeof parsed.articleEn === 'string' ? parsed.articleEn : ''
    const articleZh = typeof parsed.articleZh === 'string' ? parsed.articleZh : undefined
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
    const parsed = parseJson<{ articleZh?: unknown; termMeaningZh?: unknown }>(content)
    const articleZh = typeof parsed.articleZh === 'string' ? parsed.articleZh : ''
    const termMeaningZh = typeof parsed.termMeaningZh === 'string' ? parsed.termMeaningZh : ''
    if (!articleZh || !termMeaningZh) throw new Error('Invalid stage4_final output')
    return { articleZh, termMeaningZh }
  },
}
