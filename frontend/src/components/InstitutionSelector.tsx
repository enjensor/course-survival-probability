import { useState, useMemo, useRef, useEffect } from 'react'
import type { Institution } from '../types'

interface Props {
  institutions: Institution[]
  value: number | null
  onChange: (id: number | null) => void
  stateFilter?: string | null
  onClearStateFilter?: () => void
}

/** Common abbreviations prospective students might search for */
const ABBREVIATIONS: Record<string, string[]> = {
  'usyd': ['The University of Sydney'],
  'unsw': ['University of New South Wales'],
  'uts': ['University of Technology Sydney'],
  'wsu': ['Western Sydney University'],
  'uow': ['University of Wollongong'],
  'mq': ['Macquarie University'],
  'anu': ['The Australian National University'],
  'unimelb': ['The University of Melbourne'],
  'monash': ['Monash University'],
  'rmit': ['RMIT University'],
  'deakin': ['Deakin University'],
  'latrobe': ['La Trobe University'],
  'swinburne': ['Swinburne University of Technology'],
  'uq': ['The University of Queensland'],
  'qut': ['Queensland University of Technology'],
  'griffith': ['Griffith University'],
  'jcu': ['James Cook University'],
  'usc': ['University of the Sunshine Coast'],
  'adelaide': ['The University of Adelaide', 'Adelaide University'],
  'flinders': ['Flinders University'],
  'unisa': ['University of South Australia'],
  'uwa': ['The University of Western Australia'],
  'curtin': ['Curtin University'],
  'murdoch': ['Murdoch University'],
  'ecu': ['Edith Cowan University'],
  'utas': ['University of Tasmania'],
  'cdu': ['Charles Darwin University'],
  'csu': ['Charles Sturt University'],
  'une': ['University of New England'],
  'acu': ['Australian Catholic University'],
  'cqu': ['CQUniversity'],
  'usq': ['University of Southern Queensland'],
  'vu': ['Victoria University'],
  'federation': ['Federation University Australia'],
  'newcastle': ['The University of Newcastle'],
  'canberra': ['University of Canberra'],
  'bond': ['Bond University'],
  'notre dame': ['The University of Notre Dame Australia'],
}

export default function InstitutionSelector({ institutions, value, onChange, stateFilter, onClearStateFilter }: Props) {
  const [query, setQuery] = useState('')
  const [open, setOpen] = useState(false)
  const ref = useRef<HTMLDivElement>(null)

  const selected = institutions.find((i) => i.id === value)

  const filtered = useMemo(() => {
    if (!query) return institutions
    const q = query.toLowerCase()
    // Check if query matches an abbreviation
    const abbrMatches = new Set<string>()
    for (const [abbr, names] of Object.entries(ABBREVIATIONS)) {
      if (abbr.includes(q) || q.includes(abbr)) {
        names.forEach((n) => abbrMatches.add(n.toLowerCase()))
      }
    }
    return institutions.filter(
      (i) => i.name.toLowerCase().includes(q)
        || i.state?.toLowerCase().includes(q)
        || abbrMatches.has(i.name.toLowerCase()),
    )
  }, [query, institutions])

  // Clear query when parent resets value to null (e.g. state filter change)
  useEffect(() => {
    if (value === null) setQuery('')
  }, [value])

  // Close dropdown on outside click
  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false)
    }
    document.addEventListener('mousedown', handler)
    return () => document.removeEventListener('mousedown', handler)
  }, [])

  return (
    <div ref={ref} className="relative flex-1 min-w-0">
      <label className="block text-sm font-medium text-gray-400 mb-1">
        <span className="flex items-center gap-2">
          Institution
          {stateFilter && (
            <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-indigo-900/50 border border-indigo-700 text-xs text-indigo-300">
              {stateFilter}
              {onClearStateFilter && (
                <button
                  onClick={(e) => { e.preventDefault(); onClearStateFilter() }}
                  className="hover:text-indigo-100 transition-colors ml-0.5"
                  aria-label="Clear state filter"
                >
                  &times;
                </button>
              )}
            </span>
          )}
        </span>
      </label>
      <input
        type="text"
        role="combobox"
        aria-expanded={open && filtered.length > 0}
        aria-haspopup="listbox"
        aria-controls="institution-listbox"
        aria-autocomplete="list"
        aria-label={stateFilter ? `Search institutions in ${stateFilter}` : 'Search for an institution'}
        className="w-full rounded-lg bg-gray-800 border border-gray-700 px-4 py-2.5 text-sm
                   text-gray-100 placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-indigo-500
                   focus:border-transparent transition"
        placeholder={stateFilter
          ? `Search ${institutions.length} institutions in ${stateFilter}...`
          : 'Search for an institution...'}
        value={open ? query : selected ? selected.name : query}
        onChange={(e) => {
          setQuery(e.target.value)
          setOpen(true)
          if (!e.target.value) onChange(null)
        }}
        onFocus={() => {
          setOpen(true)
          if (selected) setQuery('')
        }}
      />
      {open && filtered.length > 0 && (
        <ul
          id="institution-listbox"
          role="listbox"
          aria-label="Institutions"
          className="absolute z-50 mt-1 w-full max-h-64 overflow-auto rounded-lg bg-gray-800
                       border border-gray-700 shadow-xl"
        >
          {filtered.slice(0, 50).map((inst) => (
            <li
              key={inst.id}
              role="option"
              aria-selected={inst.id === value}
              className={`px-4 py-2 text-sm cursor-pointer hover:bg-gray-700 transition
                ${inst.id === value ? 'bg-indigo-900/40 text-indigo-300' : 'text-gray-200'}`}
              onClick={() => {
                onChange(inst.id)
                setQuery(inst.name)
                setOpen(false)
              }}
            >
              <span>{inst.name}</span>
              {inst.state && (
                <span className="ml-2 text-xs text-gray-500">{inst.state}</span>
              )}
            </li>
          ))}
        </ul>
      )}
    </div>
  )
}
