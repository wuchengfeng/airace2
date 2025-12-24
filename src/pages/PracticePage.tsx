import { useEffect, useRef, useState } from 'react'
import type { ReactNode } from 'react'
import { Link, useNavigate, useParams } from 'react-router-dom'
import { useAppActions, useAppState } from '../app/storeHooks'
import { aiProvider } from '../ai/provider'
import type { JudgeMeaningOutput } from '../ai/types'
import { getCurrentItemId } from '../storage/localState'
import { HighlightText } from '../lib/highlight'
import { Button } from '../ui/Button'
import { Card } from '../ui/Card'
import { TextArea } from '../ui/TextField'
import { cn } from '../ui/cn'

type AttemptNo = 1 | 2 | 3

type SpeechRecognitionResultItemLike = {
  isFinal: boolean
  0: { transcript: string }
}

type SpeechRecognitionEventLike = {
  results: ArrayLike<SpeechRecognitionResultItemLike>
}

type SpeechRecognitionInstance = {
  lang: string
  continuous: boolean
  interimResults: boolean
  onresult: ((event: SpeechRecognitionEventLike) => void) | null
  onerror: (() => void) | null
  onend: (() => void) | null
  start: () => void
  stop: () => void
}

type SpeechRecognitionConstructor = new () => SpeechRecognitionInstance

function canUseSpeechRecognition() {
  const w = window as unknown as {
    SpeechRecognition?: SpeechRecognitionConstructor
    webkitSpeechRecognition?: SpeechRecognitionConstructor
  }
  return Boolean(w.SpeechRecognition ?? w.webkitSpeechRecognition)
}

function TermHeader(props: { term: string }) {
  return (
    <Card className="relative overflow-hidden p-5">
      <div className="pointer-events-none absolute inset-0 bg-gradient-to-br from-white/10 via-white/0 to-white/5" />
      <div className="relative">
        <div className="text-xs font-semibold tracking-wide text-white/60">目标词 / 词组</div>
        <div className="mt-2 text-3xl font-semibold tracking-tight text-white">{props.term}</div>
      </div>
    </Card>
  )
}

function StageCard(props: { label: string; title: string; right?: ReactNode; children: ReactNode }) {
  return (
    <Card className="space-y-3 p-5">
      <div className="flex items-center justify-between gap-3">
        <div className="min-w-0">
          <div className="text-xs font-semibold tracking-wide text-white/60">{props.label}</div>
          <div className="mt-1 text-xs font-medium text-white/55">{props.title}</div>
        </div>
        {props.right ? <div className="shrink-0">{props.right}</div> : null}
      </div>
      {props.children}
    </Card>
  )
}

function StageOneCard(props: { term: string; sentence?: string; sentenceZh?: string }) {
  const [showZh, setShowZh] = useState(false)
  return (
    <StageCard
      label="阶段 1 · 原句"
      title="只看原句猜词义"
      right={
        <Button
          size="sm"
          variant="secondary"
          onClick={() => setShowZh((v) => !v)}
        >
          {showZh ? '隐藏中文' : '显示中文'}
        </Button>
      }
    >
      <div className="rounded-xl border border-white/10 bg-white/5 p-3 text-sm leading-relaxed text-white/80 ring-1 ring-white/10">
        <HighlightText text={props.sentence ? props.sentence : '原句生成中…'} query={props.term} />
      </div>
      {showZh ? (
        <div className="rounded-xl border border-white/10 bg-white/5 p-3 text-sm leading-relaxed text-white/80 ring-1 ring-white/10">
          <HighlightText text={props.sentenceZh ? props.sentenceZh : '中文生成中…'} query={props.term} />
        </div>
      ) : null}
    </StageCard>
  )
}
function StageTwoCard(props: {
  term: string
  sentence: string
  prevSentence?: string
  nextSentence?: string
  explanationZh?: string
  contextZh?: string
}) {
  const [showZh, setShowZh] = useState(false)
  // Only consider contextZh as valid content. explanationZh is legacy/spoiler.
  const hasZh = Boolean(props.contextZh)

  return (
    <StageCard
      label="阶段 2 · 上下文提示"
      title="读完上下文再猜一次"
      right={
        hasZh ? (
          <Button size="sm" variant="secondary" onClick={() => setShowZh((v) => !v)}>
            {showZh ? '隐藏中文' : '显示中文'}
          </Button>
        ) : undefined
      }
    >
      <div className="space-y-1 text-sm leading-relaxed text-white/75">
        {props.prevSentence ? <div>{props.prevSentence}</div> : null}
        <div className="font-medium text-white/90">
          <HighlightText text={props.sentence} query={props.term} />
        </div>
        {props.nextSentence ? <div>{props.nextSentence}</div> : null}
      </div>
      {showZh && props.contextZh ? (
        <div className="mt-2 text-sm leading-relaxed text-white/60">
          <HighlightText text={props.contextZh} query={props.term} />
        </div>
      ) : null}
    </StageCard>
  )
}

function StageThreeCard(props: { articleEn?: string; articleZh?: string; term: string }) {
  const [showZh, setShowZh] = useState(false)
  return (
    <StageCard
      label="阶段 3 · 短文"
      title="读完短文再猜一次"
      right={
        props.articleZh ? (
          <Button size="sm" variant="secondary" onClick={() => setShowZh((v) => !v)}>
            {showZh ? '隐藏中文' : '显示中文'}
          </Button>
        ) : undefined
      }
    >
      {props.articleEn ? (
        <div className="whitespace-pre-wrap text-sm leading-relaxed text-white/75">
          <HighlightText text={props.articleEn} query={props.term} />
        </div>
      ) : null}
      {showZh && props.articleZh ? (
        <div className="mt-2 whitespace-pre-wrap text-sm leading-relaxed text-white/60">
          <HighlightText text={props.articleZh} query={props.term} />
        </div>
      ) : null}
    </StageCard>
  )
}

function StageFourCard(props: { articleZh?: string; termMeaningZh?: string }) {
  return (
    <StageCard label="阶段 4 · 最终解释" title="已记录到错题本">
      {props.articleZh ? (
        <div className="whitespace-pre-wrap text-sm leading-relaxed text-white/75">
          <HighlightText text={props.articleZh} query={props.termMeaningZh ?? ''} />
        </div>
      ) : null}
      {props.termMeaningZh ? (
        <div className="rounded-xl border border-amber-300/20 bg-amber-500/10 p-3 text-sm text-amber-200 ring-1 ring-amber-300/20">
          {props.termMeaningZh}
        </div>
      ) : null}
    </StageCard>
  )
}

export function PracticePage() {
  const { listId } = useParams()
  const state = useAppState()
  const actions = useAppActions()
  const nav = useNavigate()

  const list = state.lists.find((l) => l.id === listId)
  const items = (listId ? state.itemsByListId[listId] : []) ?? []
  const progress = (listId ? state.practiceByListId[listId] : undefined) ?? undefined
  const currentItemId = listId ? getCurrentItemId(state, listId) : undefined
  const currentItem = items.find((i) => i.id === currentItemId)
  const isComplete = Boolean(progress && progress.order.length > 0 && progress.cursor >= progress.order.length)

  const [attemptNo, setAttemptNo] = useState<AttemptNo>(1)
  const [userMeaningZh, setUserMeaningZh] = useState('')
  const [isSubmitting, setSubmitting] = useState(false)
  const [lastJudge, setLastJudge] = useState<JudgeMeaningOutput | null>(null)
  const [errorText, setErrorText] = useState<string | null>(null)
  const [finalLocked, setFinalLocked] = useState(false)
  const [correctLocked, setCorrectLocked] = useState(false)
  const [generatingStep, setGeneratingStep] = useState<string | null>(null)

  const [isListening, setListening] = useState(false)
  const recognitionRef = useRef<SpeechRecognitionInstance | null>(null)

  useEffect(() => {
    if (!listId) return
    actions.ensurePractice(listId)
  }, [actions, listId])

  useEffect(() => {
    setAttemptNo(1)
    setUserMeaningZh('')
    setSubmitting(false)
    setLastJudge(null)
    setErrorText(null)
    setFinalLocked(false)
    setListening(false)
    setCorrectLocked(false)
  }, [currentItemId])

  useEffect(() => {
    if (!listId) return
    if (!isComplete) return
    nav(`/app/practice/${listId}/result`, { replace: true })
  }, [isComplete, listId, nav])

  useEffect(() => {
    if (!listId) return
    if (!currentItem) return
    const currentRunId = progress?.run?.id
    const runMatch = currentItem.material?.runId === currentRunId
    const sentence = runMatch ? currentItem.material?.sentence : undefined
    const sentenceZh = runMatch ? currentItem.material?.sentenceZh : undefined
    if (sentence && sentenceZh) return

    let cancelled = false
    const prompts = state.aiPrompts

    const doWork = async () => {
      try {
        if (!sentence) {
          setGeneratingStep('正在生成例句...')
          const out = await aiProvider.generateSentence({ term: currentItem.term, prompts })
          if (cancelled) return
          setGeneratingStep(null)
          const materialBase = runMatch ? currentItem.material ?? {} : {}
          actions.setItemMaterial(listId, currentItem.id, {
            ...materialBase,
            runId: currentRunId,
            sentence: out.sentence,
            sentenceZh: out.sentenceZh,
          })
          return
        }
        if (!sentenceZh) {
          setGeneratingStep('正在生成例句翻译...')
          const out = await aiProvider.translateSentenceZh({ term: currentItem.term, sentence, prompts })
          if (cancelled) return
          setGeneratingStep(null)
          const materialBase = runMatch ? currentItem.material ?? {} : {}
          actions.setItemMaterial(listId, currentItem.id, {
            ...materialBase,
            runId: currentRunId,
            sentence,
            sentenceZh: out.sentenceZh,
          })
        }
      } catch (e) {
        if (cancelled) return
        setGeneratingStep(null)
        const msg = e instanceof Error ? e.message : '生成失败'
        setErrorText(msg)
      }
    }

    void doWork()
    .catch((e) => {
      if (cancelled) return
      const msg = e instanceof Error ? e.message : '生成失败'
      setErrorText(msg)
    })

    return () => {
      cancelled = true
    }
  }, [actions, currentItem, listId, state.aiPrompts, progress?.run?.id])

  if (!listId || !list) {
    return (
      <Card className="p-5">
        <div className="text-sm font-semibold text-white">词表不存在</div>
        <div className="mt-2">
          <Link to="/admin/lists">
            <Button variant="secondary">返回词表</Button>
          </Link>
        </div>
      </Card>
    )
  }

  if (items.length === 0) {
    return (
      <Card className="space-y-3 p-5">
        <div className="text-sm font-semibold text-white">还没有条目</div>
        <div className="text-sm text-white/60">先给这个词表添加目标词 / 词组。</div>
        <div>
          <Link to={`/admin/lists/${listId}`}>
            <Button>去添加</Button>
          </Link>
        </div>
      </Card>
    )
  }

  if (isComplete) {
    return (
      <Card className="space-y-2 p-5">
        <div className="text-sm font-semibold text-white">本轮已完成</div>
        <div className="text-sm text-white/60">正在进入结果页…</div>
      </Card>
    )
  }

  if (!currentItem) {
    return (
      <Card className="space-y-3 p-5">
        <div className="text-sm font-semibold text-white">练习准备中</div>
        <div className="text-sm text-white/60">正在生成练习顺序。</div>
        <div className="flex items-center gap-2">
          <Button
            variant="secondary"
            onClick={() => {
              actions.ensurePractice(listId, true)
            }}
          >
            重新开始
          </Button>
          <Link to={`/admin/lists/${listId}`}>
            <Button variant="ghost">返回编辑</Button>
          </Link>
        </div>
      </Card>
    )
  }

  const safeListId = listId
  const item = currentItem

  const idx =
    progress && currentItemId
      ? Math.max(0, progress.order.findIndex((id) => id === currentItemId))
      : 0
  const total = progress?.order.length ?? items.length

  const prompts = state.aiPrompts
  const currentRunIdView = progress?.run?.id
  const runMatchView = item.material?.runId === currentRunIdView
  const sentence = runMatchView ? item.material?.sentence : undefined
  const sentenceZh = runMatchView ? item.material?.sentenceZh : undefined
  const context = runMatchView ? item.material?.context : undefined
  const article = runMatchView ? item.material?.article : undefined
  const finalReveal = runMatchView ? item.material?.finalReveal : undefined

  const showStage2 = attemptNo >= 2
  const showStage3 = attemptNo >= 3
  const showStage4 = finalLocked

  const speechAvailable = canUseSpeechRecognition()

  async function onSubmit() {
    if (isSubmitting || finalLocked) return
    const meaning = userMeaningZh.trim()
    if (!meaning) return
    setSubmitting(true)
    setErrorText(null)
    try {
      const currentRunId = progress?.run?.id
      const runMatch = item.material?.runId === currentRunId
      const materialBase = runMatch ? item.material ?? {} : {}
      let ensuredSentence = (materialBase.sentence ?? sentence ?? '').trim()
      if (!ensuredSentence) {
        setGeneratingStep('正在生成例句...')
        const out = await aiProvider.generateSentence({ term: item.term, prompts })
        ensuredSentence = out.sentence.trim()
        setGeneratingStep(null)
        actions.setItemMaterial(safeListId, item.id, {
          ...materialBase,
          runId: currentRunId,
          sentence: ensuredSentence,
          sentenceZh: out.sentenceZh,
        })
      }
      setGeneratingStep('正在评测...')
      const judge = await aiProvider.judgeMeaning({
        term: item.term,
        sentence: ensuredSentence,
        prompts,
        material: {
          prevSentence: context?.prevSentence,
          nextSentence: context?.nextSentence,
          articleEn: article?.articleEn,
          sentenceExplanationEn: article?.sentenceExplanationEn,
        },
        userMeaningZh: meaning,
      })
      setGeneratingStep(null)
      setLastJudge(judge)

      if (judge.isCorrect) {
        actions.markPracticeCorrect(safeListId, attemptNo, {
          itemId: item.id,
          term: item.term,
          userMeaningZh: meaning,
          snapshot: materialBase,
        })
        actions.recordCorrect({
          id: crypto.randomUUID(),
          listId: safeListId,
          itemId: item.id,
          term: item.term,
          sentence: ensuredSentence,
          stage: attemptNo,
          snapshot: { material: materialBase },
        })
        setCorrectLocked(true)
        return
      }

      if (attemptNo === 1) {
        // Force regeneration if context is missing OR if the new contextZh field is missing (legacy data)
        if (!context || !context.contextZh) {
          setGeneratingStep('正在生成上下文...')
          const generated = await aiProvider.generateContext({ term: item.term, sentence: ensuredSentence, prompts })
          setGeneratingStep(null)
          actions.setItemMaterial(safeListId, item.id, {
            ...materialBase,
            runId: currentRunId,
            sentence: ensuredSentence,
            context: {
              prevSentence: generated.prevSentence,
              nextSentence: generated.nextSentence,
              explanationZh: generated.explanationZh,
              contextZh: generated.contextZh,
            },
          })
        }
        setAttemptNo(2)
        return
      }

      if (attemptNo === 2) {
        // Validate Stage 3 content requirements:
        // 1. Must exist
        // 2. No legacy sentenceExplanationEn
        // 3. articleZh must exist
        // 4. articleZh MUST contain the term (case-insensitive) to ensure it wasn't translated
        // 5. articleEn should generally be longer than the context (basic check)
        const termInZh = article?.articleZh && article.articleZh.toLowerCase().includes(item.term.toLowerCase())
        const isValid = article && !article.sentenceExplanationEn && article.articleZh && termInZh

        if (!isValid) {
          setGeneratingStep('正在生成短文...')
          const generated = await aiProvider.generateArticle({
            term: item.term,
            sentence: ensuredSentence,
            prevSentence: context?.prevSentence,
            nextSentence: context?.nextSentence,
            prompts,
          })
          setGeneratingStep(null)
          actions.setItemMaterial(safeListId, item.id, {
            ...materialBase,
            runId: currentRunId,
            sentence: ensuredSentence,
            article: { articleEn: generated.articleEn, articleZh: generated.articleZh },
          })
        }
        setAttemptNo(3)
        return
      }

      let resolvedArticle = materialBase.article ?? article
      let articleUpdated = false
      
      // Apply same validation for final submission flow
      const termInZh = resolvedArticle?.articleZh && resolvedArticle.articleZh.toLowerCase().includes(item.term.toLowerCase())
      const isValidArticle = resolvedArticle && !resolvedArticle.sentenceExplanationEn && resolvedArticle.articleZh && termInZh

      if (!isValidArticle) {
        setGeneratingStep('正在生成短文...')
        const generated = await aiProvider.generateArticle({
          term: item.term,
          sentence: ensuredSentence,
          prevSentence: context?.prevSentence,
          nextSentence: context?.nextSentence,
          prompts,
        })
        setGeneratingStep(null)
        resolvedArticle = { articleEn: generated.articleEn, articleZh: generated.articleZh }
        articleUpdated = true
      }

      const finalInputArticle = resolvedArticle
      if (!finalInputArticle) throw new Error('Missing article for final reveal')

      let resolvedFinal = finalReveal ?? materialBase.finalReveal
      let finalUpdated = false
      if (!resolvedFinal) {
        setGeneratingStep('正在生成最终解释...')
        const generated = await aiProvider.finalReveal({
          term: item.term,
          sentence: ensuredSentence,
          articleEn: finalInputArticle.articleEn,
          sentenceExplanationEn: finalInputArticle.sentenceExplanationEn,
          prompts,
        })
        setGeneratingStep(null)
        resolvedFinal = { articleZh: generated.articleZh, termMeaningZh: generated.termMeaningZh }
        finalUpdated = true
      }

      const resolvedMaterial = {
        ...materialBase,
        runId: currentRunId,
        sentence: ensuredSentence,
        article: resolvedArticle,
        finalReveal: resolvedFinal,
      }

      if (articleUpdated || finalUpdated) {
        actions.setItemMaterial(safeListId, item.id, resolvedMaterial)
      }

      actions.recordMistake({
        id: crypto.randomUUID(),
        listId: safeListId,
        itemId: item.id,
        term: item.term,
        sentence: ensuredSentence,
        snapshot: { material: resolvedMaterial },
      })
      actions.markPracticeFinalWrong(safeListId, {
        itemId: item.id,
        term: item.term,
        userMeaningZh: meaning,
        snapshot: resolvedMaterial,
      })
      setFinalLocked(true)
    } catch (e) {
      const msg = e instanceof Error ? e.message : '提交失败'
      setErrorText(msg)
    } finally {
      setSubmitting(false)
    }
  }

  function stopListening() {
    try {
      recognitionRef.current?.stop?.()
    } catch {
      return
    } finally {
      setListening(false)
      recognitionRef.current = null
    }
  }

  function startListening() {
    if (!speechAvailable || isListening) return
    const w = window as unknown as {
      SpeechRecognition?: SpeechRecognitionConstructor
      webkitSpeechRecognition?: SpeechRecognitionConstructor
    }
    const SR = w.SpeechRecognition ?? w.webkitSpeechRecognition
    if (!SR) return
    const recognition = new SR()
    recognition.lang = 'zh-CN'
    recognition.continuous = false
    recognition.interimResults = true
    recognition.onresult = (event) => {
      const last = event.results.length > 0 ? event.results[event.results.length - 1] : undefined
      const transcript = last?.[0]?.transcript
      if (typeof transcript === 'string' && transcript.trim().length > 0) {
        setUserMeaningZh(transcript.trim())
      }
      const isFinal = Boolean(last?.isFinal)
      if (isFinal) stopListening()
    }
    recognition.onerror = () => {
      stopListening()
    }
    recognition.onend = () => {
      stopListening()
    }
    recognitionRef.current = recognition
    setListening(true)
    recognition.start()
  }

  

  const submitLabel = isSubmitting ? '提交中…' : finalLocked ? '已结束' : correctLocked ? '已正确' : '提交'
  const progressPct = total > 0 ? Math.round((Math.max(idx, 0) / total) * 100) : 0
  const stage = finalLocked ? 4 : attemptNo
  const stageMeta =
    stage === 1
      ? { label: '阶段 1', title: '仅看原句' }
      : stage === 2
        ? { label: '阶段 2', title: '补上下文再猜' }
        : stage === 3
          ? { label: '阶段 3', title: '短文解释再猜' }
          : { label: '阶段 4', title: '最终解释 + 错题本' }

  const stepClass = (n: number) =>
    cn(
      'rounded-full px-3 py-1 text-xs font-semibold ring-1 transition-colors',
      n === stage
        ? 'bg-white text-slate-900 ring-white/20'
        : n < stage
          ? 'bg-white/10 text-white/80 ring-white/10'
          : 'bg-transparent text-white/45 ring-white/10',
    )

  const isLast = idx + 1 >= total
  
  useEffect(() => {
    function handleKeyDown(e: KeyboardEvent) {
      if (e.key !== 'Enter') return
      if (e.isComposing) return
      if (e.shiftKey || e.ctrlKey || e.metaKey) return
      e.preventDefault()
      if (finalLocked || correctLocked) {
        actions.nextPractice(safeListId)
        if (isLast) nav(`/app/practice/${safeListId}/result`, { replace: true })
        return
      }
      if (!isSubmitting && userMeaningZh.trim().length > 0) {
        void onSubmit()
      }
    }
    window.addEventListener('keydown', handleKeyDown)
    return () => window.removeEventListener('keydown', handleKeyDown)
  }, [finalLocked, correctLocked, isSubmitting, userMeaningZh, actions, safeListId, isLast, nav, onSubmit])

  return (
    <div className="space-y-4">
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <h1 className="truncate text-xl font-semibold tracking-tight text-white">{list.name}</h1>
          <div className="mt-1 text-sm text-white/60">
            第 {Math.max(idx + 1, 1)} / {total} 题 · 第 {attemptNo} 次尝试
          </div>
        </div>
        <div className="flex items-center gap-2">
          <Button
            size="sm"
            variant="secondary"
            onClick={() => {
              actions.ensurePractice(safeListId, true)
            }}
          >
            重置
          </Button>
          <Link to={`/admin/lists/${safeListId}`}>
            <Button size="sm" variant="ghost">
              编辑
            </Button>
          </Link>
        </div>
      </div>

      <TermHeader term={item.term} />

      <div className="space-y-2">
        <div className="h-2 w-full overflow-hidden rounded-full bg-white/10 ring-1 ring-white/10">
          <div className="h-full rounded-full bg-gradient-to-r from-sky-400 to-indigo-400" style={{ width: `${progressPct}%` }} />
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <span className={stepClass(1)}>阶段 1 · 原句</span>
          <span className={stepClass(2)}>阶段 2 · 上下文</span>
          <span className={stepClass(3)}>阶段 3 · 短文</span>
          <span className={stepClass(4)}>阶段 4 · 最终</span>
        </div>
      </div>

      <StageOneCard key={`s1-${item.id}`} term={item.term} sentence={sentence} sentenceZh={sentenceZh} />
      {showStage2 ? (
        <StageTwoCard
          key={`s2-${item.id}`}
          term={item.term}
          sentence={sentence ?? ''}
          prevSentence={context?.prevSentence}
          nextSentence={context?.nextSentence}
          explanationZh={context?.explanationZh}
          contextZh={context?.contextZh}
        />
      ) : null}
      {showStage3 ? (
        <StageThreeCard
          key={`s3-${item.id}`}
          articleEn={article?.articleEn}
          articleZh={article?.articleZh}
          term={item.term}
        />
      ) : null}
      {showStage4 ? <StageFourCard articleZh={finalReveal?.articleZh} termMeaningZh={finalReveal?.termMeaningZh} /> : null}

      <Card className="space-y-3 p-5">
        <div className="flex items-center justify-between gap-3">
          <div className="min-w-0">
            <div className="text-sm font-semibold text-white">{stageMeta.label} · 作答</div>
            <div className="mt-1 text-xs font-medium text-white/55">
              {generatingStep ? (
                <span className="flex items-center gap-1.5 text-sky-400">
                  <span className="relative flex h-2 w-2">
                    <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-sky-400 opacity-75"></span>
                    <span className="relative inline-flex h-2 w-2 rounded-full bg-sky-500"></span>
                  </span>
                  {generatingStep}
                </span>
              ) : stage === 1 ? (
                '仅根据原句猜'
              ) : stage === 2 ? (
                '结合上下文再猜'
              ) : stage === 3 ? (
                '结合短文解释再猜'
              ) : (
                '已结束，可进入下一题'
              )}
            </div>
          </div>
          {speechAvailable ? (
            <Button
              size="sm"
              variant={isListening ? 'danger' : 'secondary'}
              onClick={() => {
                if (isListening) stopListening()
                else startListening()
              }}
              disabled={finalLocked || correctLocked || isSubmitting}
            >
              {isListening ? '停止' : '语音输入'}
            </Button>
          ) : null}
        </div>
        <TextArea
          placeholder="支持语音或手动输入，例如：编造/组成/补充…（按语境）"
          value={userMeaningZh}
          onChange={(e) => setUserMeaningZh(e.target.value)}
          disabled={finalLocked || correctLocked}
        />

        {lastJudge && !lastJudge.isCorrect ? (
          <div className="rounded-xl border border-rose-400/20 bg-rose-500/10 p-3 text-sm text-rose-200 ring-1 ring-rose-400/20">
            不太对
            {typeof lastJudge.score === 'number' ? `（${lastJudge.score}% 匹配度）` : ''}
            {lastJudge.reason ? `：${lastJudge.reason}` : '，再试一次。'}
          </div>
        ) : lastJudge && lastJudge.isCorrect ? (
          <div className="rounded-xl border border-emerald-300/20 bg-emerald-500/10 p-3 text-sm text-emerald-200 ring-1 ring-emerald-300/20">
            对了
            {typeof lastJudge.score === 'number' ? `（${lastJudge.score}% 匹配度）` : ''}
            {lastJudge.reason ? `：${lastJudge.reason}` : '，进入下一题。'}
          </div>
        ) : null}

        {errorText ? (
          <div className="rounded-xl border border-rose-400/20 bg-rose-500/10 p-3 text-sm text-rose-200 ring-1 ring-rose-400/20">
            {errorText}
          </div>
        ) : null}

        <div className="flex items-center justify-between gap-2">
          <Button
            variant="ghost"
            onClick={() => {
              setUserMeaningZh('')
              setLastJudge(null)
              setErrorText(null)
            }}
            disabled={isSubmitting}
          >
            清空
          </Button>
          <div className="flex items-center gap-2">
            {finalLocked || correctLocked ? (
              <Button
                onClick={() => {
                  actions.nextPractice(safeListId)
                  if (isLast) nav(`/app/practice/${safeListId}/result`, { replace: true })
                }}
              >
                {isLast ? '查看本轮结果' : '下一题'}
              </Button>
            ) : (
              <Button onClick={onSubmit} disabled={isSubmitting || userMeaningZh.trim().length === 0}>
                {submitLabel}
              </Button>
            )}
          </div>
        </div>
      </Card>

    </div>
  )
}
