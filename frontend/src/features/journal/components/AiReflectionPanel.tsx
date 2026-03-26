import { useState } from 'react'

import { useGetAiRuns, useReflect, useStreamReflect } from '../hooks/useJournal'

interface AiReflectionPanelProps {
  entryId: string
  latestReflection: string | null
}

export function AiReflectionPanel({ entryId, latestReflection }: Readonly<AiReflectionPanelProps>) {
  const reflectMutation = useReflect(entryId)
  const stream = useStreamReflect(entryId)
  const runs = useGetAiRuns(entryId)
  const [showHistory, setShowHistory] = useState(false)

  return (
    <aside className="space-y-4 rounded-xl border border-slate-200 bg-white p-4">
      <div className="flex items-center justify-between">
        <h3 className="text-sm font-bold uppercase tracking-[0.15em] text-slate-700">AI Reflection</h3>
        <button className="text-xs font-semibold text-blue-600" onClick={() => setShowHistory((v) => !v)} type="button">
          {showHistory ? 'Hide History' : 'History'}
        </button>
      </div>
      <div className="rounded-xl border border-blue-100 bg-gradient-to-br from-blue-50 to-indigo-50 p-4">
        <p className="mb-2 text-[11px] font-bold uppercase tracking-widest text-blue-600">Latest Reflection</p>
        <p className="whitespace-pre-wrap text-sm leading-6 text-slate-700">
          {stream.isStreaming ? stream.streamedText || 'Streaming...' : latestReflection || 'No reflection yet.'}
        </p>
      </div>
      <div className="flex gap-2">
        <button
          className="flex-1 rounded-lg border border-slate-200 bg-white px-3 py-2 text-left text-xs font-medium text-slate-700"
          disabled={reflectMutation.isPending}
          onClick={() => reflectMutation.mutate()}
          type="button"
        >
          {reflectMutation.isPending ? 'Reflecting...' : 'Reflect'}
        </button>
        <button
          className="flex-1 rounded-lg border border-slate-200 bg-white px-3 py-2 text-left text-xs font-medium text-slate-700"
          disabled={stream.isStreaming}
          onClick={() => stream.start()}
          type="button"
        >
          {stream.isStreaming ? 'Streaming...' : 'Stream Reflect'}
        </button>
      </div>
      {showHistory ? (
        <div className="space-y-2 border-t border-slate-100 pt-3">
          {runs.data?.map((run) => (
            <article className="rounded-lg border border-slate-200 bg-slate-50 p-3 text-xs text-slate-600" key={run.id}>
              <p className="mb-1 font-semibold uppercase tracking-wide text-slate-700">{run.status}</p>
              <p className="line-clamp-2">{run.response_text ?? 'No response'}</p>
            </article>
          ))}
        </div>
      ) : null}
    </aside>
  )
}
