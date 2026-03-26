import { useCreateMoment, useMoments } from '../hooks/useMoments'
import { MomentForm } from './MomentForm'

interface MomentTimelineProps {
  readonly personId: string
}

export function MomentTimeline({ personId }: MomentTimelineProps) {
  const { data, isLoading } = useMoments(personId)
  const createMoment = useCreateMoment(personId)

  return (
    <section className="space-y-4">
      <MomentForm onSubmit={(payload) => createMoment.mutateAsync(payload).then(() => undefined)} />
      {isLoading ? <p className="text-sm text-slate-500">Loading moments...</p> : null}
      <div className="space-y-3">
        {data?.map((moment) => (
          <article key={moment.id} className="rounded-xl border border-slate-200 bg-white p-4">
            <div className="flex items-center justify-between">
              <h4 className="font-medium">{moment.title}</h4>
              <span className="rounded-full bg-slate-100 px-2 py-1 text-xs font-medium">{moment.sentiment}</span>
            </div>
            <p className="mt-1 text-xs text-slate-500">{moment.occurred_on}</p>
            <p className="mt-2 text-sm text-slate-700">{moment.what_happened}</p>
          </article>
        ))}
      </div>
    </section>
  )
}
