import type { Field } from '../types'

interface Props {
  fields: Field[]
  value: number | null
  onChange: (id: number | null) => void
}

export default function FieldSelector({ fields, value, onChange }: Props) {
  return (
    <div className="flex-1 min-w-0">
      <label htmlFor="field-selector" className="block text-sm font-medium text-gray-400 mb-1">Field of Study</label>
      <select
        id="field-selector"
        aria-label="Select a field of study"
        className="w-full rounded-lg bg-gray-800 border border-gray-700 px-4 py-2.5 text-sm
                   text-gray-100 focus:outline-none focus:ring-2 focus:ring-indigo-500
                   focus:border-transparent transition appearance-none"
        value={value ?? ''}
        onChange={(e) => onChange(e.target.value ? Number(e.target.value) : null)}
      >
        <option value="">All fields</option>
        {fields.map((f) => (
          <option key={f.id} value={f.id}>
            {f.name}
          </option>
        ))}
      </select>
    </div>
  )
}
