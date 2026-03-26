import { useState } from 'react'

import type { MomentPayload } from '../api/create-moment'

interface MomentFormProps {
  readonly onSubmit: (payload: MomentPayload) => Promise<void>
}

export function MomentForm({ onSubmit }: MomentFormProps) {
  const [title, setTitle] = useState('')
  const [momentType, setMomentType] = useState('conversation')
  const [sentiment, setSentiment] = useState('neutral')
  const [occurredOn, setOccurredOn] = useState(new Date().toISOString().slice(0, 10))
  const [whatHappened, setWhatHappened] = useState('')

  const submit: NonNullable<React.ComponentProps<'form'>['onSubmit']> = (event) => {
    event.preventDefault()
    void (async () => {
      await onSubmit({
        title,
        moment_type: momentType,
        sentiment,
        occurred_on: occurredOn,
        what_happened: whatHappened,
      })
      setTitle('')
      setWhatHappened('')
    })()
  }

  return (
    <form className="space-y-3 rounded-xl border border-slate-200 bg-slate-50 p-4" onSubmit={submit}>
      <h4 className="font-semibold">Log moment</h4>
      <input className="w-full rounded-lg border border-slate-300 bg-white px-3 py-2" onChange={(e) => setTitle(e.target.value)} placeholder="Title" value={title} />
      <div className="grid gap-2 md:grid-cols-3">
        <select className="rounded-lg border border-slate-300 bg-white px-3 py-2" onChange={(e) => setMomentType(e.target.value)} value={momentType}>
          <option value="conversation">Conversation</option>
          <option value="shared_experience">Shared experience</option>
          <option value="act_of_care">Act of care</option>
          <option value="conflict">Conflict</option>
          <option value="milestone">Milestone</option>
          <option value="observation">Observation</option>
          <option value="other">Other</option>
        </select>
        <select className="rounded-lg border border-slate-300 bg-white px-3 py-2" onChange={(e) => setSentiment(e.target.value)} value={sentiment}>
          <option value="warm">Warm</option>
          <option value="neutral">Neutral</option>
          <option value="hurtful">Hurtful</option>
          <option value="complicated">Complicated</option>
        </select>
        <input className="rounded-lg border border-slate-300 bg-white px-3 py-2" onChange={(e) => setOccurredOn(e.target.value)} type="date" value={occurredOn} />
      </div>
      <textarea
        className="w-full rounded-lg border border-slate-300 bg-white px-3 py-2"
        onChange={(e) => setWhatHappened(e.target.value)}
        placeholder="What happened?"
        rows={3}
        value={whatHappened}
      />
      <button className="rounded-lg bg-slate-900 px-3 py-2 text-sm text-white" type="submit">
        Save moment
      </button>
    </form>
  )
}
