import type { AppStateV1, CorrectEntry, ListItem, MistakeEntry, PracticeMode, PracticeRun, PromptTemplate, WordList } from '../domain/models'
import { createSeededRng, shuffleInPlace } from '../domain/shuffle'

const STORAGE_KEY = 'airace.state'

function createRun(total: number): PracticeRun {
  return {
    id: crypto.randomUUID(),
    startedAt: Date.now(),
    total,
    correctByAttempt: { 1: 0, 2: 0, 3: 0 },
    finalWrongCount: 0,
    records: [],
  }
}

function createDefaultPrompts(): Record<string, PromptTemplate> {
  return {
    stage1_sentence: {
      messages: [
        {
          role: 'system',
          content:
            'You generate learning materials. Output strictly in JSON. Do not wrap in markdown. Use double quotes for keys/strings.',
        },
        {
          role: 'user',
          content:
            'Generate one natural English sentence that clearly implies the meaning of "{{term}}" without directly defining it. The sentence must include "{{term}}" exactly.\nAlso provide a Chinese translation of the sentence in "sentenceZh".\n\nCRITICAL RULE: In "sentenceZh", do NOT translate "{{term}}". You MUST keep the English word "{{term}}" exactly as is.\nExample:\nTerm: "apple"\nSentence: "He ate a red apple."\nSentenceZh: "他吃了一个红色的 apple。" (NOT "他吃了一个红色的苹果。")\n\nReturn JSON: {"sentence":"...","sentenceZh":"..."}',
        },
      ],
    },
    stage2_context: {
      messages: [
        {
          role: 'system',
          content:
            'You generate learning materials. Output strictly in JSON. Do not wrap in markdown. Use double quotes for keys/strings.',
        },
        {
          role: 'user',
          content:
            'Given the target term "{{term}}" and the sentence: "{{sentence}}", generate one previous sentence and one next sentence to form a 3-sentence coherent paragraph (Prev + Sentence + Next). \n\nRules:\n1. The middle sentence MUST be the exact input sentence.\n2. The context should provide strong clues about the meaning of "{{term}}" but MUST NOT explicitly define it.\n3. The paragraph should be natural and coherent.\n4. Provide a Chinese translation of the WHOLE paragraph (Prev + Sentence + Next) in "contextZh".\n5. In the translation ("contextZh"), you MUST keep the term "{{term}}" in its original English form (do NOT translate it). If "{{term}}" appears multiple times, keep ALL occurrences in English.\n6. "contextZh" MUST be a direct translation of the story/paragraph. It must NOT contain any definitions, explanations, or notes like "X means Y". Just the translation text.\n\nReturn JSON: {"prevSentence":"...","nextSentence":"...","contextZh":"..."}',
        },
      ],
    },
    stage3_article: {
      messages: [
        {
          role: 'system',
          content:
            'You generate learning materials. Output strictly in JSON. Do not wrap in markdown. Use double quotes for keys/strings.',
        },
        {
          role: 'user',
          content:
            'Given the target term "{{term}}" and a 3-sentence context:\nPrev: "{{prevSentence}}"\nCenter: "{{sentence}}"\nNext: "{{nextSentence}}"\n\nWrite a short English paragraph (5-7 sentences total) that incorporates ALL three context sentences verbatim. \n\nRules:\n1. You MUST include the "Prev", "Center", and "Next" sentences exactly as provided, in that order. You may add 1-2 sentences before or after to make it a complete paragraph, but do NOT alter the provided sentences.\n2. Provide a Chinese translation of the WHOLE paragraph in "articleZh".\n3. CRITICAL: In "articleZh", you MUST NOT translate the term "{{term}}". You MUST use the English word "{{term}}" inside the Chinese sentence.\n   - Wrong: ...他们不得不放弃...\n   - Right: ...他们不得不 {{term}} ...\n4. "articleZh" MUST be a direct translation. No extra explanations.\n\nReturn JSON: {"articleEn":"...","articleZh":"..."}',
        },
      ],
    },
    stage4_final: {
      messages: [
        {
          role: 'system',
          content:
            'You generate learning materials. Output strictly in JSON. Do not wrap in markdown. Use double quotes for keys/strings.',
        },
        {
          role: 'user',
          content:
            'Given term "{{term}}", sentence "{{sentence}}", and articleEn "{{articleEn}}", output a concise Chinese summary of the article and the specific meaning of the term in this context. Return JSON: {"articleZh":"...","termMeaningZh":"..."}',
        },
      ],
    },
    judge_meaning: {
      messages: [
        {
          role: 'system',
          content:
            'You evaluate whether the user meaning matches the term meaning in the given context. Output strictly in JSON. Do not wrap in markdown.',
        },
        {
          role: 'user',
          content:
            'You will score the semantic match between the user guess (Chinese) and the correct meaning of the target term in THIS sentence context.\n\nInputs:\nTerm: "{{term}}"\nSentence: "{{sentence}}"\nPrev: "{{prevSentence}}"\nNext: "{{nextSentence}}"\nArticleEn: "{{articleEn}}"\nUserMeaningZh: "{{userMeaningZh}}"\n\nRules:\n- First, infer the correct meaning of the term in this specific context (Chinese).\n- Then compare the user meaning to that correct meaning.\n- Output score 0-100: 100 means almost identical; minor nuance difference reduces score.\n- If score < 80: set isCorrect=false. Do NOT return "correctMeaningZh" or "reason". Just return {"score":..., "isCorrect":false}.\n- If score >= 80: set isCorrect=true. You MAY return "correctMeaningZh" (the correct meaning) and "reason" (brief explanation). Return {"score":..., "isCorrect":true, "correctMeaningZh":"...", "reason":"..."}.\n\nReturn JSON (no markdown).',
        },
      ],
    },
  }
}

export function createEmptyState(): AppStateV1 {
  return {
    version: 1,
    lists: [],
    itemsByListId: {},
    mistakes: [],
    practiceByListId: {},
    practiceHistory: [],
    settings: { mode: 'fixed_sequence' },
    aiPrompts: createDefaultPrompts(),
  }
}

export function loadState(): AppStateV1 {
  const raw = localStorage.getItem(STORAGE_KEY)
  if (!raw) return createEmptyState()
  try {
    const parsed = JSON.parse(raw) as unknown
    if (
      typeof parsed === 'object' &&
      parsed !== null &&
      (parsed as { version?: unknown }).version === 1
    ) {
      const base = createEmptyState()
      const obj = parsed as Record<string, unknown>
      const settings = typeof obj.settings === 'object' && obj.settings !== null ? (obj.settings as Record<string, unknown>) : {}
      const mode = settings.mode === 'fixed_sequence' || settings.mode === 'ai_infinite' || settings.mode === 'fixed_random' ? (settings.mode as PracticeMode) : base.settings?.mode
      const practiceHistoryRaw = obj.practiceHistory
      const aiPromptsRaw = obj.aiPrompts
      const upgradedPrompts = upgradeAiPrompts(aiPromptsRaw as AppStateV1['aiPrompts'] | undefined)

      return {
        ...base,
        ...(parsed as AppStateV1),
        practiceHistory: Array.isArray(practiceHistoryRaw) ? (practiceHistoryRaw as AppStateV1['practiceHistory']) : [],
        settings: {
          mode: mode ?? 'fixed_sequence',
          selectedListId: typeof settings.selectedListId === 'string' ? settings.selectedListId : undefined,
          aiProvider:
            settings.aiProvider === 'tal' || settings.aiProvider === 'volces'
              ? (settings.aiProvider as 'tal' | 'volces')
              : (typeof import.meta.env.VITE_AI_PROVIDER === 'string' && import.meta.env.VITE_AI_PROVIDER.toLowerCase() === 'volces'
                  ? 'volces'
                  : typeof import.meta.env.VITE_AI_PROVIDER === 'string' && import.meta.env.VITE_AI_PROVIDER.toLowerCase() === 'user'
                    ? 'tal'
                    : undefined),
        },
        aiPrompts: upgradedPrompts,
      }
    }
  } catch {
    return createEmptyState()
  }
  return createEmptyState()
}

export function saveState(state: AppStateV1) {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(state))
}

function upgradeAiPrompts(existing?: Record<string, PromptTemplate>): Record<string, PromptTemplate> {
  const base = createDefaultPrompts()
  const out: Record<string, PromptTemplate> = { ...(existing ?? {}) }
  const stage1 = out.stage1_sentence
  const stage1NeedsUpgrade =
    !stage1 ||
    !Array.isArray(stage1.messages) ||
    !stage1.messages.some((m) => typeof m.content === 'string' && m.content.includes('CRITICAL RULE'))
  if (stage1NeedsUpgrade) {
    out.stage1_sentence = base.stage1_sentence
  }

  const stage2 = out.stage2_context
  const stage2NeedsUpgrade =
    !stage2 ||
    !Array.isArray(stage2.messages) ||
    !stage2.messages.some((m) => typeof m.content === 'string' && /"contextZh"/.test(m.content))
  if (stage2NeedsUpgrade) {
    out.stage2_context = base.stage2_context
  }

  const stage3 = out.stage3_article
  const stage3NeedsUpgrade =
    !stage3 ||
    !Array.isArray(stage3.messages) ||
    !stage3.messages.some((m) => typeof m.content === 'string' && /Prev", "Center", and "Next"/.test(m.content))
  if (stage3NeedsUpgrade) {
    out.stage3_article = base.stage3_article
  }

  const judge = out.judge_meaning
  const judgeNeedsUpgrade =
    !judge ||
    !Array.isArray(judge.messages) ||
    !judge.messages.some((m) => typeof m.content === 'string' && /If score < 80/.test(m.content))
  if (judgeNeedsUpgrade) {
    out.judge_meaning = base.judge_meaning
  }

  // Ensure missing keys are filled
  for (const key of Object.keys(base)) {
    if (!out[key]) out[key] = base[key]
  }

  return out
}

export type TeableEnv = {
  baseUrl: string
  apiToken: string
  wordTableTableId?: string
  wordListsTableId?: string
}

export type TeableWordTableRecord = {
  id: string
  tableName: string
  createTime?: string
  createdTime?: string
}

export function getTeableEnv(): TeableEnv | null {
  const apiToken = import.meta.env.VITE_TEABLE_API_TOKEN
  const wordTableTableId = import.meta.env.VITE_TEABLE_WORDTABLE_TABLE_ID
  const wordListsTableId = import.meta.env.VITE_TEABLE_WORDLISTS_TABLE_ID ?? import.meta.env.VITE_TEABLE_WORDLIST_TABLE_ID
  const baseUrlRaw = import.meta.env.VITE_TEABLE_BASE_URL

  const token = typeof apiToken === 'string' && apiToken.trim().length > 0 ? apiToken.trim() : ''

  const baseUrl =
    typeof baseUrlRaw === 'string' && baseUrlRaw.trim().length > 0 ? baseUrlRaw.trim() : 'https://yach-teable.zhiyinlou.com'

  return {
    baseUrl: baseUrl.replace(/\/+$/g, ''),
    apiToken: token,
    wordTableTableId: typeof wordTableTableId === 'string' && wordTableTableId.trim().length > 0 ? wordTableTableId.trim() : undefined,
    wordListsTableId: typeof wordListsTableId === 'string' && wordListsTableId.trim().length > 0 ? wordListsTableId.trim() : undefined,
  }
}

async function teableJson<T>(env: TeableEnv, input: string, init?: RequestInit): Promise<T> {
  const url = new URL(input, env.baseUrl)
  const res = await fetch(url, {
    ...init,
    headers: {
      Accept: 'application/json',
      ...(env.apiToken ? { Authorization: `Bearer ${env.apiToken}` } : {}),
      ...(init?.body ? { 'Content-Type': 'application/json' } : {}),
      ...(init?.headers ?? {}),
    },
  })

  if (!res.ok) {
    let detail = ''
    try {
      detail = await res.text()
    } catch {
      detail = ''
    }
    throw new Error(`Teable request failed: ${res.status} ${res.statusText}${detail ? `: ${detail}` : ''}`)
  }

  return (await res.json()) as T
}

function parseTeableWordTableName(fields: unknown): string | undefined {
  if (!fields || typeof fields !== 'object') return undefined
  const obj = fields as Record<string, unknown>
  const tableName = obj.tableName ?? obj.TableName ?? obj.词表名 ?? obj.表名
  return typeof tableName === 'string' ? tableName : undefined
}

function getWordTableTableId(env: TeableEnv): string {
  if (!env.wordTableTableId) throw new Error('Teable WordTable tableId missing')
  return env.wordTableTableId
}

function getWordListsTableId(env: TeableEnv): string {
  if (!env.wordListsTableId) throw new Error('Teable WordLists tableId missing')
  return env.wordListsTableId
}

export async function fetchTeableWordTables(env: TeableEnv): Promise<TeableWordTableRecord[]> {
  const tableId = getWordTableTableId(env)
  const records = await fetchAllTeableRecords(env, `/api/table/${tableId}/record`)
  const out: TeableWordTableRecord[] = []
  for (const r of records) {
    if (!r || typeof r !== 'object') continue
    const rec = r as Record<string, unknown>
    const id = typeof rec.id === 'string' ? rec.id : undefined
    const tableName = parseTeableWordTableName(rec.fields)
    const fields = rec.fields && typeof rec.fields === 'object' ? (rec.fields as Record<string, unknown>) : undefined
    const createTime = fields && typeof fields.createTime === 'string' ? (fields.createTime as string) : undefined
    const createdTime = typeof rec.createdTime === 'string' ? rec.createdTime : undefined
    if (!id || !tableName) continue
    out.push({ id, tableName, createTime, createdTime })
  }
  return out
}

export async function createTeableWordTable(env: TeableEnv, tableName: string): Promise<{ id: string; createdTime?: string }> {
  const tableId = getWordTableTableId(env)
  const data = await teableJson<unknown>(env, `/api/table/${tableId}/record`, {
    method: 'POST',
    body: JSON.stringify({ records: [{ fields: { tableName, createTime: new Date().toISOString() } }] }),
  })

  if (!data || typeof data !== 'object') throw new Error('Teable create failed: invalid response')
  const records = (data as { records?: unknown }).records
  if (!Array.isArray(records) || records.length === 0) throw new Error('Teable create failed: empty records')

  const first = records[0]
  if (!first || typeof first !== 'object') throw new Error('Teable create failed: invalid record')
  const rec = first as Record<string, unknown>
  const id = typeof rec.id === 'string' ? rec.id : undefined
  const createdTime = typeof rec.createdTime === 'string' ? rec.createdTime : undefined
  if (!id) throw new Error('Teable create failed: missing record id')
  return { id, createdTime }
}

export async function renameTeableWordTable(env: TeableEnv, recordId: string, tableName: string): Promise<void> {
  const tableId = getWordTableTableId(env)
  await teableJson(env, `/api/table/${tableId}/record/${recordId}`, {
    method: 'PATCH',
    body: JSON.stringify({ record: { fields: { tableName } } }),
  })
}

export async function deleteTeableWordTables(env: TeableEnv, recordIds: string[]): Promise<void> {
  const tableId = getWordTableTableId(env)
  const params = new URLSearchParams()
  for (const id of recordIds) params.append('recordIds[]', id)
  await teableJson(env, `/api/table/${tableId}/record?${params.toString()}`, { method: 'DELETE' })
}

export type TeableWordRecord = {
  id: string
  word: string
  wordTableId?: string
  createTime?: string
  createdTime?: string
}

function parseTeableWord(fields: unknown): { word?: string; wordTableId?: string; createTime?: string } {
  if (!fields || typeof fields !== 'object') return {}
  const obj = fields as Record<string, unknown>
  const word = typeof obj.word === 'string' ? obj.word : undefined
  const createTime = typeof obj.createTime === 'string' ? obj.createTime : undefined

  const rel = obj.wordTable
  let wordTableId: string | undefined
  if (typeof rel === 'string') {
    wordTableId = rel
  } else if (Array.isArray(rel)) {
    const first = rel[0]
    if (typeof first === 'string') wordTableId = first
    else if (first && typeof first === 'object') {
      const objFirst = first as { id?: unknown; recordId?: unknown }
      const rid = typeof objFirst.id === 'string' ? objFirst.id : typeof objFirst.recordId === 'string' ? objFirst.recordId : undefined
      if (typeof rid === 'string') wordTableId = rid
    }
  } else if (rel && typeof rel === 'object') {
    const objRel = rel as { id?: unknown; recordId?: unknown }
    const rid = typeof objRel.id === 'string' ? objRel.id : typeof objRel.recordId === 'string' ? objRel.recordId : undefined
    if (typeof rid === 'string') wordTableId = rid
  }

  return { word, wordTableId, createTime }
}

export async function fetchTeableWords(env: TeableEnv, wordTableId: string): Promise<ListItem[]> {
  const tableId = getWordListsTableId(env)
  const records = await fetchAllTeableRecords(env, `/api/table/${tableId}/record`)

  const out: ListItem[] = []
  for (const r of records) {
    if (!r || typeof r !== 'object') continue
    const rec = r as Record<string, unknown>
    const id = typeof rec.id === 'string' ? rec.id : undefined
    if (!id) continue

    const parsed = parseTeableWord(rec.fields)
    if (!parsed.word) continue
    if (parsed.wordTableId && parsed.wordTableId !== wordTableId) continue
    if (!parsed.wordTableId) continue

    const ts = parsed.createTime ? Date.parse(parsed.createTime) : typeof rec.createdTime === 'string' ? Date.parse(rec.createdTime) : NaN
    out.push({ id, term: parsed.word, createdAt: Number.isFinite(ts) ? ts : Date.now() })
  }

  if (import.meta.env.DEV) {
    try {
      const sample = records.slice(0, 10).map((r) => {
        const rec = r as Record<string, unknown>
        const fields = (rec.fields ?? {}) as Record<string, unknown>
        return {
          id: typeof rec.id === 'string' ? rec.id : '',
          word: typeof fields.word === 'string' ? fields.word : '',
          wordTable: fields.wordTable,
        }
      })
      console.debug('[Teable] WordLists raw sample:', sample)
      console.debug('[Teable] Parsed items for wordTableId', wordTableId, '=>', out.length)
    } catch (e) {
      console.debug('[Teable] WordLists sample debug parse error', e)
    }
  }

  out.sort((a, b) => b.createdAt - a.createdAt)
  return out
}

export async function fetchTeableWordsSample(env: TeableEnv): Promise<{ id: string; word?: string; wordTable?: unknown }[]> {
  const tableId = getWordListsTableId(env)
  const u = new URL(`/api/table/${tableId}/record`, env.baseUrl)
  u.searchParams.set('take', '20')
  u.searchParams.set('skip', '0')
  const data = await teableJson<unknown>(env, u.pathname + u.search + u.hash, { method: 'GET' })
  const list = (data && typeof data === 'object' ? ((data as { records?: unknown }).records as unknown) : undefined) ?? []
  const records = Array.isArray(list) ? list : []
  const sample = records.map((r) => {
    const rec = r as Record<string, unknown>
    const fields = (rec.fields ?? {}) as Record<string, unknown>
    return {
      id: typeof rec.id === 'string' ? rec.id : '',
      word: typeof fields.word === 'string' ? fields.word : undefined,
      wordTable: fields.wordTable,
    }
  })
  return sample
}

async function fetchAllTeableRecords(env: TeableEnv, path: string): Promise<Record<string, unknown>[]> {
  const makeUrl = (qs?: Record<string, string>) => {
    const u = new URL(path, env.baseUrl)
    if (qs) for (const [k, v] of Object.entries(qs)) u.searchParams.set(k, v)
    if (!u.searchParams.has('take')) u.searchParams.set('take', '1000')
    if (!u.searchParams.has('skip')) u.searchParams.set('skip', '0')
    return u.pathname + u.search + u.hash
  }

  const out: Record<string, unknown>[] = []

  // Phase 1: Prefer official pagination params 'take' and 'skip'
  const take = 1000
  let skip = 0
  let guard = 0
  let lastFirstId: string | null = null
  while (guard < 5000) {
    guard += 1
    const pathWithParams = makeUrl({ take: String(take), skip: String(skip) })
    const data = await teableJson<unknown>(env, pathWithParams, { method: 'GET' })
    if (!data || typeof data !== 'object') break
    const obj = data as Record<string, unknown>
    const records = (obj.records ?? obj.data ?? []) as unknown
    const arr: Record<string, unknown>[] = Array.isArray(records)
      ? (records.filter((r) => r && typeof r === 'object') as Record<string, unknown>[])
      : []
    if (arr.length === 0) break
    const firstId = (arr[0] as { id?: unknown }).id
    if (typeof firstId === 'string' && lastFirstId === firstId) {
      // API ignored skip, avoid infinite loop
      break
    }
    if (typeof firstId === 'string') lastFirstId = firstId
    for (const r of arr) out.push(r)
    if (arr.length < take) {
      // Last page reached
      break
    }
    skip += arr.length
  }
  if (out.length > 0) return out

  // Phase 2: Fallback to various next page hints if take/skip did not work
  let nextPath: string | null = makeUrl()
  guard = 0
  lastFirstId = null
  while (nextPath && guard < 200) {
    guard += 1
    const data = await teableJson<unknown>(env, nextPath, { method: 'GET' })
    if (!data || typeof data !== 'object') break
    const obj = data as Record<string, unknown>
    const records = (obj.records ?? obj.data ?? []) as unknown
    const arr: Record<string, unknown>[] = Array.isArray(records)
      ? (records.filter((r) => r && typeof r === 'object') as Record<string, unknown>[])
      : []
    for (const r of arr) out.push(r)
    const firstId = arr.length > 0 ? ((arr[0] as { id?: unknown }).id as string | undefined) : undefined
    if (firstId && lastFirstId === firstId) break
    if (firstId) lastFirstId = firstId ?? null

    let next: string | undefined
    const links = obj.links as unknown
    if (!next && links && typeof links === 'object') {
      const l = links as { next?: unknown }
      if (typeof l.next === 'string') next = l.next
    }
    if (!next && typeof (obj as { next?: unknown }).next === 'string') {
      next = (obj as { next?: string }).next
    }
    const nextPageToken =
      typeof (obj as { nextPageToken?: unknown }).nextPageToken === 'string'
        ? ((obj as { nextPageToken?: string }).nextPageToken as string)
        : undefined
    if (!next && nextPageToken) next = makeUrl({ pageToken: nextPageToken, take: String(take) })
    const offset =
      typeof (obj as { offset?: unknown }).offset === 'string'
        ? ((obj as { offset?: string }).offset as string)
        : undefined
    if (!next && offset) next = makeUrl({ offset, take: String(take) })
    nextPath = next ?? null
  }
  return out
}

export async function createTeableWord(env: TeableEnv, wordTableId: string, word: string): Promise<{ id: string; createdTime?: string }> {
  const tableId = getWordListsTableId(env)
  const data = await teableJson<unknown>(env, `/api/table/${tableId}/record`, {
    method: 'POST',
    body: JSON.stringify({
      records: [
        {
          fields: {
            word,
            createTime: new Date().toISOString(),
            wordTable: [{ id: wordTableId }],
          },
        },
      ],
      typecast: true,
    }),
  })

  if (!data || typeof data !== 'object') throw new Error('Teable create failed: invalid response')
  const records = (data as { records?: unknown }).records
  if (!Array.isArray(records) || records.length === 0) throw new Error('Teable create failed: empty records')
  const first = records[0]
  if (!first || typeof first !== 'object') throw new Error('Teable create failed: invalid record')
  const rec = first as Record<string, unknown>
  const id = typeof rec.id === 'string' ? rec.id : undefined
  const createdTime = typeof rec.createdTime === 'string' ? rec.createdTime : undefined
  if (!id) throw new Error('Teable create failed: missing record id')
  return { id, createdTime }
}

export async function createTeableWords(
  env: TeableEnv,
  listId: string,
  words: string[],
): Promise<Array<{ id: string; term: string; createdTime?: number }>> {
  if (words.length === 0) return []
  const tableId = getWordListsTableId(env)
  const wordTableId = listId

  // Teable API allows creating multiple records in one request
  // However, we should verify the max limit per request. 
  // Assuming the caller handles large batch splitting, we just map input to records here.
  
  const recordsPayload = words.map((word) => ({
    fields: {
      word,
      createTime: new Date().toISOString(),
      wordTable: [{ id: wordTableId }],
    },
  }))

  const data = await teableJson<unknown>(env, `/api/table/${tableId}/record`, {
    method: 'POST',
    body: JSON.stringify({
      records: recordsPayload,
      typecast: true,
    }),
  })

  if (!data || typeof data !== 'object') throw new Error('Teable batch create failed: invalid response')
  const records = (data as { records?: unknown }).records
  if (!Array.isArray(records)) throw new Error('Teable batch create failed: records not array')

  return records.map((r: Record<string, unknown>, i: number) => {
    const id = typeof r.id === 'string' ? r.id : crypto.randomUUID()
    const createdTimeStr = typeof r.createdTime === 'string' ? r.createdTime : undefined
    const createdTime = createdTimeStr ? Date.parse(createdTimeStr) : Date.now()
    return { id, term: words[i], createdTime: Number.isFinite(createdTime) ? createdTime : Date.now() }
  })
}

export async function updateTeableWord(env: TeableEnv, recordId: string, word: string): Promise<void> {
  const tableId = getWordListsTableId(env)
  await teableJson(env, `/api/table/${tableId}/record/${recordId}`, {
    method: 'PATCH',
    body: JSON.stringify({ record: { fields: { word } }, typecast: true }),
  })
}

export async function deleteTeableWords(env: TeableEnv, recordIds: string[]): Promise<void> {
  const tableId = getWordListsTableId(env)
  const params = new URLSearchParams()
  for (const id of recordIds) params.append('recordIds[]', id)
  await teableJson(env, `/api/table/${tableId}/record?${params.toString()}`, { method: 'DELETE' })
}

export function mergeWordTablesFromTeable(state: AppStateV1, remote: TeableWordTableRecord[]): AppStateV1 {
  const next: AppStateV1 = structuredClone(state)

  const remoteLists: WordList[] = remote
    .map((r) => {
      const ts = r.createTime ? Date.parse(r.createTime) : r.createdTime ? Date.parse(r.createdTime) : NaN
      const createdAt = Number.isFinite(ts) ? ts : Date.now()
      return { id: r.id, name: r.tableName, createdAt }
    })
    .sort((a, b) => b.createdAt - a.createdAt)

  // Preserve local-only lists (like 'review-corrects')
  const localPreserved = state.lists.filter((l) => l.id === 'review-corrects' || l.id === 'review-mistakes')
  next.lists = [...localPreserved, ...remoteLists]

  for (const l of next.lists) {
    next.itemsByListId[l.id] = next.itemsByListId[l.id] ?? []
  }

  const selectedListId = next.settings?.selectedListId
  if (selectedListId && !next.lists.some((l) => l.id === selectedListId)) {
    next.settings = { ...(next.settings ?? { mode: 'fixed_sequence' }), selectedListId: undefined }
  }

  return next
}

export function ensurePracticeOrder(
  state: AppStateV1,
  listId: string,
  options?: { reshuffle?: boolean; mode?: PracticeMode },
) {
  const items = state.itemsByListId[listId] ?? []
  const existing = state.practiceByListId[listId]
  const mode = options?.mode ?? existing?.mode ?? 'fixed_sequence'

  // Explicit reshuffle, new session, or mode change forces a full reset
  const shouldReset = !existing || options?.reshuffle || existing.mode !== mode

  if (shouldReset) {
    let order = items.map((i) => i.id)
    if (mode === 'fixed_random') {
      const rng = createSeededRng(Date.now())
      shuffleInPlace(order, rng)
      order = order.slice(0, 10)
    }

    state.practiceByListId[listId] = { order, cursor: 0, updatedAt: Date.now(), run: createRun(order.length), mode }
    return state
  }

  // If not resetting, we might need to update the order to reflect list changes (e.g. added/removed items)
  // while preserving the user's current progress (cursor).
  if (mode === 'fixed_sequence') {
    const newOrder = items.map((i) => i.id)
    const isDifferent =
      existing.order.length !== newOrder.length || existing.order.some((id, i) => id !== newOrder[i])

    if (isDifferent) {
      // Find the item that the user was currently on
      const currentItemId = existing.order[existing.cursor]
      let newCursor = 0

      if (currentItemId) {
        const idx = newOrder.indexOf(currentItemId)
        if (idx !== -1) {
          // Found the item, update cursor to its new position
          newCursor = idx
        } else {
          // Item was deleted, keep cursor index but clamp it
          newCursor = Math.min(existing.cursor, newOrder.length - 1)
          if (newCursor < 0) newCursor = 0
        }
      }

      existing.order = newOrder
      existing.cursor = newCursor
      existing.updatedAt = Date.now()
      if (existing.run) existing.run.total = newOrder.length
      else existing.run = createRun(newOrder.length)
    }
  }

  // For fixed_random, we treat the 10 items as a snapshot session, so we don't auto-update it
  // until the user finishes or reshuffles.

  if (existing && !existing.run) existing.run = createRun(existing.order.length)
  return state
}

export function deleteHistoryRun(state: AppStateV1, runId: string) {
  const next = structuredClone(state)
  next.practiceHistory = (next.practiceHistory ?? []).filter((h) => h.id !== runId)
  return next
}

export function deletePracticeSession(state: AppStateV1, listId: string) {
  const next = structuredClone(state)
  delete next.practiceByListId[listId]
  return next
}

export function recordCorrect(state: AppStateV1, entry: Omit<CorrectEntry, 'correctCount' | 'lastCorrectAt'>) {
  state.corrects = state.corrects ?? []
  const existing = state.corrects.find(
    (c) => c.listId === entry.listId && c.itemId === entry.itemId && c.stage === entry.stage,
  )
  if (existing) {
    existing.correctCount += 1
    existing.lastCorrectAt = Date.now()
    existing.snapshot = entry.snapshot
  } else {
    state.corrects.unshift({
      ...entry,
      correctCount: 1,
      lastCorrectAt: Date.now(),
    })
  }
  return state
}

export function getCurrentItemId(state: AppStateV1, listId: string) {
  const progress = state.practiceByListId[listId]
  if (!progress) return undefined
  if (progress.order.length === 0) return undefined
  const cursor = Math.max(progress.cursor, 0)
  if (cursor >= progress.order.length) return undefined
  return progress.order[cursor]
}

export function moveNext(state: AppStateV1, listId: string) {
  const progress = state.practiceByListId[listId]
  if (!progress) return state
  if (progress.order.length === 0) return state

  const nextCursor = progress.cursor + 1
  progress.cursor = Math.min(nextCursor, progress.order.length)
  if (progress.cursor >= progress.order.length) {
    if (!progress.run) progress.run = createRun(progress.order.length)
    if (!progress.run.endedAt) progress.run.endedAt = Date.now()
  }
  progress.updatedAt = Date.now()
  return state
}

export function upsertList(state: AppStateV1, list: WordList) {
  const existingIdx = state.lists.findIndex((l) => l.id === list.id)
  if (existingIdx >= 0) state.lists[existingIdx] = list
  else state.lists = [list, ...state.lists]
  return state
}

export function deleteList(state: AppStateV1, listId: string) {
  state.lists = state.lists.filter((l) => l.id !== listId)
  delete state.itemsByListId[listId]
  delete state.practiceByListId[listId]
  state.mistakes = state.mistakes.filter((m) => m.listId !== listId)
  state.practiceHistory = (state.practiceHistory ?? []).filter((h) => h.listId !== listId)
  return state
}

export function upsertItem(state: AppStateV1, listId: string, item: ListItem) {
  const arr = state.itemsByListId[listId] ?? []
  const idx = arr.findIndex((i) => i.id === item.id)
  if (idx >= 0) arr[idx] = item
  else arr.unshift(item)
  state.itemsByListId[listId] = arr
  return saveState(state)
}

export function bulkUpsertItems(state: AppStateV1, listId: string, items: ListItem[]) {
  state.itemsByListId[listId] = state.itemsByListId[listId] ?? []
  const existingMap = new Map(state.itemsByListId[listId].map((i) => [i.id, i]))
  
  for (const item of items) {
    existingMap.set(item.id, item)
  }
  
  // Convert back to array and sort by createdAt desc
  state.itemsByListId[listId] = Array.from(existingMap.values()).sort((a, b) => b.createdAt - a.createdAt)
  saveState(state)
}

export function deleteItem(state: AppStateV1, listId: string, itemId: string) {
  const arr = state.itemsByListId[listId] ?? []
  state.itemsByListId[listId] = arr.filter((i) => i.id !== itemId)
  const progress = state.practiceByListId[listId]
  if (progress) {
    progress.order = progress.order.filter((id) => id !== itemId)
    progress.cursor = Math.min(progress.cursor, progress.order.length)
    if (progress.run) progress.run.total = progress.order.length
    progress.updatedAt = Date.now()
  }
  state.mistakes = state.mistakes.filter((m) => m.itemId !== itemId)
  return state
}

export function recordMistake(state: AppStateV1, entry: Omit<MistakeEntry, 'wrongCount' | 'lastWrongAt'>) {
  const existing = state.mistakes.find((m) => m.listId === entry.listId && m.itemId === entry.itemId)
  if (existing) {
    existing.wrongCount += 1
    existing.lastWrongAt = Date.now()
    existing.snapshot = entry.snapshot
  } else {
    state.mistakes.unshift({
      ...entry,
      wrongCount: 1,
      lastWrongAt: Date.now(),
    })
  }
  return state
}
