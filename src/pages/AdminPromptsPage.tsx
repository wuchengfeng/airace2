import { useMemo, useState } from 'react'
import { useAppActions, useAppState } from '../app/storeHooks'
import type { PromptMessage, PromptRole, PromptTemplate } from '../domain/models'
import { Button } from '../ui/Button'
import { Card } from '../ui/Card'
import { TextArea, TextField } from '../ui/TextField'
import { cn } from '../ui/cn'

const roles: PromptRole[] = ['system', 'user', 'assistant']
const emptyPrompts: Record<string, PromptTemplate> = {}

function normalizeKey(raw: string) {
  return raw.trim().replace(/\s+/g, '_')
}

function cloneTemplate(t: PromptTemplate): PromptTemplate {
  return { messages: t.messages.map((m) => ({ role: m.role, content: m.content })) }
}

export function AdminPromptsPage() {
  const state = useAppState()
  const actions = useAppActions()

  const prompts = state.aiPrompts ?? emptyPrompts
  const keys = useMemo(() => Object.keys(prompts).sort(), [prompts])
  const [selectedKey, setSelectedKey] = useState(() => keys[0] ?? '')

  const [draftKey, setDraftKey] = useState('')
  const [draft, setDraft] = useState<PromptTemplate | null>(() => {
    const t = keys[0] ? prompts[keys[0]] : undefined
    return t ? cloneTemplate(t) : null
  })

  function updateMessage(idx: number, next: PromptMessage) {
    if (!draft) return
    const messages = draft.messages.slice()
    messages[idx] = next
    setDraft({ messages })
  }

  function removeMessage(idx: number) {
    if (!draft) return
    setDraft({ messages: draft.messages.filter((_, i) => i !== idx) })
  }

  function addMessage() {
    if (!draft) return
    setDraft({ messages: [...draft.messages, { role: 'user', content: '' }] })
  }

  function save() {
    if (!draft || !selectedKey) return
    actions.setPromptTemplate(selectedKey, draft)
  }

  function createNewKey() {
    const key = normalizeKey(draftKey)
    if (!key) return
    if (prompts[key]) {
      setSelectedKey(key)
      setDraft(cloneTemplate(prompts[key]))
      setDraftKey('')
      return
    }
    const next: PromptTemplate = { messages: [{ role: 'system', content: '' }, { role: 'user', content: '' }] }
    actions.setPromptTemplate(key, next)
    setSelectedKey(key)
    setDraft(next)
    setDraftKey('')
  }

  return (
    <div className="space-y-4">
      <Card className="relative overflow-hidden p-5">
        <div className="pointer-events-none absolute inset-0 bg-gradient-to-br from-white/10 via-white/0 to-white/5" />
        <div className="relative space-y-3">
          <div>
            <div className="text-xs font-semibold tracking-wide text-white/60">后台</div>
            <h1 className="mt-1 text-xl font-semibold tracking-tight text-white">提示词管理</h1>
            <div className="mt-2 text-sm text-white/60">
              支持多条消息与 system / user / assistant 角色。可用变量：{'{{term}}'}
            </div>
          </div>

          <div className="grid gap-3 sm:grid-cols-[1fr_auto] sm:items-end">
            <TextField label="新增提示词 key" placeholder="例如：stage1_sentence" value={draftKey} onChange={(e) => setDraftKey(e.target.value)} />
            <Button variant="secondary" onClick={createNewKey} disabled={!draftKey.trim()}>
              创建/切换
            </Button>
          </div>
        </div>
      </Card>

      <Card className="p-5">
        <div className="grid gap-3 sm:grid-cols-[1fr_auto] sm:items-end">
          <label className="block">
            <div className="mb-1 text-sm font-medium text-white/85">选择提示词</div>
            <select
              className={cn(
                'h-11 w-full rounded-xl border bg-white/5 px-3 text-sm text-white outline-none transition-all',
                'ring-1 ring-white/10 focus:ring-2 focus:ring-sky-400/40 border-white/10 focus:border-white/20',
              )}
              value={selectedKey}
              onChange={(e) => {
                const nextKey = e.target.value
                setSelectedKey(nextKey)
                const t = nextKey ? prompts[nextKey] : undefined
                setDraft(t ? cloneTemplate(t) : null)
              }}
            >
              {keys.length === 0 ? <option value="">（还没有提示词）</option> : null}
              {keys.map((k) => (
                <option key={k} value={k}>
                  {k}
                </option>
              ))}
            </select>
          </label>
          <Button onClick={save} disabled={!draft || !selectedKey}>
            保存
          </Button>
        </div>
      </Card>

      {draft ? (
        <div className="grid gap-3">
          {draft.messages.map((m, idx) => (
            <Card key={idx} className="space-y-3 p-5">
              <div className="flex flex-wrap items-center justify-between gap-2">
                <label className="block">
                  <div className="mb-1 text-xs font-semibold tracking-wide text-white/60">role</div>
                  <select
                    className={cn(
                      'h-10 rounded-xl border bg-white/5 px-3 text-sm text-white outline-none transition-all',
                      'ring-1 ring-white/10 focus:ring-2 focus:ring-sky-400/40 border-white/10 focus:border-white/20',
                    )}
                    value={m.role}
                    onChange={(e) => updateMessage(idx, { ...m, role: e.target.value as PromptRole })}
                  >
                    {roles.map((r) => (
                      <option key={r} value={r}>
                        {r}
                      </option>
                    ))}
                  </select>
                </label>
                <Button size="sm" variant="ghost" onClick={() => removeMessage(idx)} disabled={draft.messages.length <= 1}>
                  删除
                </Button>
              </div>
              <TextArea
                label="content"
                value={m.content}
                onChange={(e) => updateMessage(idx, { ...m, content: e.target.value })}
                placeholder={'支持变量：{{term}}\n建议输出 JSON 以便程序解析'}
              />
            </Card>
          ))}
          <div className="flex flex-wrap gap-2">
            <Button variant="secondary" onClick={addMessage}>
              添加一条消息
            </Button>
          </div>
        </div>
      ) : (
        <Card className="p-5">
          <div className="text-sm font-semibold text-white">还没有选择提示词</div>
          <div className="mt-1 text-sm text-white/60">先创建一个 key 或从列表中选择。</div>
        </Card>
      )}
    </div>
  )
}
