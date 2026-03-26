import { useState } from 'react'
import { Link, useNavigate, useParams } from 'react-router-dom'

import { useCreatePerson, usePerson, useUpdatePerson } from '../hooks/usePeople'

export function PersonFormPage() {
  const { personId } = useParams()
  const isEdit = Boolean(personId)
  const navigate = useNavigate()
  const createPerson = useCreatePerson()
  const updatePerson = useUpdatePerson()
  usePerson(personId ?? '')

  const [name, setName] = useState('')
  const [relationshipType, setRelationshipType] = useState('friend')
  const [contactCadenceDays, setContactCadenceDays] = useState('')
  const [notes, setNotes] = useState('')

  const onSubmit: NonNullable<React.ComponentProps<'form'>['onSubmit']> = (event) => {
    event.preventDefault()
    void (async () => {
      const payload = {
        name,
        relationship_type: relationshipType,
        notes: notes || undefined,
        contact_cadence_days: contactCadenceDays ? Number(contactCadenceDays) : undefined,
      }
      if (isEdit && personId) {
        const person = await updatePerson.mutateAsync({ id: personId, payload })
        navigate(`/people/${person.id}`)
        return
      }
      const person = await createPerson.mutateAsync(payload)
      navigate(`/people/${person.id}`)
    })()
  }

  return (
    <form className="mx-auto max-w-2xl space-y-5 rounded-xl border border-slate-200 bg-white p-6 shadow-sm" onSubmit={onSubmit}>
      <div className="flex items-center justify-between">
        <h2 className="text-2xl font-semibold tracking-tight">{isEdit ? 'Edit person' : 'New person'}</h2>
        <Link className="text-sm text-slate-500 hover:text-slate-700" to="/people">
          Back to list
        </Link>
      </div>
      <label className="block">
        <span className="mb-1 block text-sm font-medium text-slate-700">Name</span>
        <input className="w-full rounded-lg border border-slate-300 px-3 py-2" onChange={(e) => setName(e.target.value)} value={name} />
      </label>
      <label className="block">
        <span className="mb-1 block text-sm font-medium text-slate-700">Relationship type</span>
        <select className="w-full rounded-lg border border-slate-300 px-3 py-2" onChange={(e) => setRelationshipType(e.target.value)} value={relationshipType}>
          <option value="close_friend">Close friend</option>
          <option value="friend">Friend</option>
          <option value="acquaintance">Acquaintance</option>
          <option value="new_person">New person</option>
          <option value="complicated">Complicated</option>
          <option value="faded">Faded</option>
        </select>
      </label>
      <label className="block">
        <span className="mb-1 block text-sm font-medium text-slate-700">Contact cadence (days)</span>
        <input
          className="w-full rounded-lg border border-slate-300 px-3 py-2"
          onChange={(e) => setContactCadenceDays(e.target.value)}
          type="number"
          value={contactCadenceDays}
        />
      </label>
      <label className="block">
        <span className="mb-1 block text-sm font-medium text-slate-700">Notes</span>
        <textarea className="w-full rounded-lg border border-slate-300 px-3 py-2" onChange={(e) => setNotes(e.target.value)} rows={4} value={notes} />
      </label>
      <div className="flex gap-2">
        <button className="rounded-lg bg-blue-600 px-4 py-2 text-white hover:bg-blue-700" type="submit">
          Save
        </button>
        <button className="rounded-lg border border-slate-300 px-4 py-2" onClick={() => navigate(-1)} type="button">
          Cancel
        </button>
      </div>
    </form>
  )
}
