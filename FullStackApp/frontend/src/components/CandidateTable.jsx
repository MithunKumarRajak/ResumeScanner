import { useState, useMemo } from 'react'
import {
  ChevronUp, ChevronDown, ChevronsUpDown,
  Search, SlidersHorizontal, Trash2, Users
} from 'lucide-react'
import useStore from '../store'

function ScoreBadge({ score }) {
  const cls =
    score >= 70 ? 'text-green-400  bg-green-400/10  border-green-400/25' :
    score >= 40 ? 'text-amber-400  bg-amber-400/10  border-amber-400/25' :
                  'text-rose-400   bg-rose-400/10   border-rose-400/25'
  return (
    <span className={`inline-flex items-center gap-1 rounded-full border px-2 py-0.5 text-xs font-bold ${cls}`}>
      {score}%
    </span>
  )
}

function MiniBar({ value }) {
  const color =
    value >= 70 ? 'bg-green-500'  :
    value >= 40 ? 'bg-amber-500'  :
                  'bg-rose-500'
  return (
    <div className="flex items-center gap-2">
      <div className="w-20 h-2 rounded-full bg-white/10 overflow-hidden">
        <div className={`h-full rounded-full ${color} transition-all duration-700`} style={{ width: `${value}%` }} />
      </div>
      <ScoreBadge score={value} />
    </div>
  )
}

export default function CandidateTable() {
  const candidates    = useStore((s) => s.candidates)
  const clearCandidates = useStore((s) => s.clearCandidates)

  const [sortKey,  setSortKey]  = useState('matchScore')
  const [sortDir,  setSortDir]  = useState('desc')
  const [nameFilter,   setNameFilter]   = useState('')
  const [skillFilter,  setSkillFilter]  = useState('')
  const [minExp,       setMinExp]       = useState(0)
  const [minScore,     setMinScore]     = useState(0)
  const [showFilters,  setShowFilters]  = useState(false)

  const handleSort = (key) => {
    if (sortKey === key) {
      setSortDir((d) => (d === 'asc' ? 'desc' : 'asc'))
    } else {
      setSortKey(key)
      setSortDir('desc')
    }
  }

  const SortIcon = ({ col }) => {
    if (sortKey !== col) return <ChevronsUpDown className="h-3.5 w-3.5 text-slate-600" />
    return sortDir === 'asc'
      ? <ChevronUp   className="h-3.5 w-3.5 text-indigo-400" />
      : <ChevronDown className="h-3.5 w-3.5 text-indigo-400" />
  }

  const filtered = useMemo(() => {
    return candidates
      .filter((c) => {
        const nameOk  = !nameFilter  || c.name.toLowerCase().includes(nameFilter.toLowerCase())
        const skillOk = !skillFilter || c.skills.some((s) => s.toLowerCase().includes(skillFilter.toLowerCase()))
        const expOk   = c.experience >= minExp
        const scoreOk = c.matchScore >= minScore
        return nameOk && skillOk && expOk && scoreOk
      })
      .sort((a, b) => {
        const va = a[sortKey]
        const vb = b[sortKey]
        const mul = sortDir === 'asc' ? 1 : -1
        if (typeof va === 'string') return va.localeCompare(vb) * mul
        return (va - vb) * mul
      })
  }, [candidates, nameFilter, skillFilter, minExp, minScore, sortKey, sortDir])

  if (candidates.length === 0) {
    return (
      <div className="glass-card p-16 flex flex-col items-center justify-center gap-4 text-center">
        <div className="flex h-16 w-16 items-center justify-center rounded-2xl bg-indigo-500/10 text-indigo-400">
          <Users className="h-8 w-8" />
        </div>
        <div>
          <p className="text-base font-semibold text-white">No candidates yet</p>
          <p className="text-sm text-slate-400 mt-1">
            Candidates appear here after being analyzed in the Candidate view.
          </p>
        </div>
      </div>
    )
  }

  return (
    <div className="space-y-4">
      {/* Toolbar */}
      <div className="flex flex-wrap items-center gap-3">
        {/* Name search */}
        <div className="relative flex-1 min-w-[200px]">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-500 pointer-events-none" />
          <input
            type="text"
            value={nameFilter}
            onChange={(e) => setNameFilter(e.target.value)}
            placeholder="Search by name…"
            className="form-input pl-9"
            id="candidate-name-filter"
          />
        </div>

        {/* Skill search */}
        <div className="relative flex-1 min-w-[180px]">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-500 pointer-events-none" />
          <input
            type="text"
            value={skillFilter}
            onChange={(e) => setSkillFilter(e.target.value)}
            placeholder="Filter by skill…"
            className="form-input pl-9"
            id="candidate-skill-filter"
          />
        </div>

        <button
          onClick={() => setShowFilters((v) => !v)}
          className={`btn-ghost flex items-center gap-1.5 border rounded-xl px-3 py-2 ${showFilters ? 'border-indigo-500/40 text-indigo-400' : 'border-[rgba(148,163,184,0.14)]'}`}
          id="toggle-filters-btn"
        >
          <SlidersHorizontal className="h-4 w-4" />
          Filters
        </button>

        <button
          onClick={clearCandidates}
          className="btn-ghost flex items-center gap-1.5 border border-[rgba(148,163,184,0.14)] rounded-xl px-3 py-2 text-rose-400 hover:bg-rose-500/10"
          id="clear-candidates-btn"
          title="Clear all candidates"
        >
          <Trash2 className="h-4 w-4" />
        </button>
      </div>

      {/* Advanced filters */}
      {showFilters && (
        <div className="glass-card p-4 grid grid-cols-1 sm:grid-cols-2 gap-4 animate-fade-in">
          <div>
            <label className="text-xs text-slate-400 mb-1.5 block">
              Min Experience: <span className="font-bold text-indigo-400">{minExp}y</span>
            </label>
            <input
              type="range" min={0} max={20} value={minExp}
              onChange={(e) => setMinExp(Number(e.target.value))}
              className="form-range w-full"
              id="exp-filter-range"
            />
          </div>
          <div>
            <label className="text-xs text-slate-400 mb-1.5 block">
              Min Match Score: <span className="font-bold text-indigo-400">{minScore}%</span>
            </label>
            <input
              type="range" min={0} max={100} value={minScore}
              onChange={(e) => setMinScore(Number(e.target.value))}
              className="form-range w-full"
              id="score-filter-range"
            />
          </div>
        </div>
      )}

      {/* Count */}
      <p className="text-xs text-slate-500">
        Showing {filtered.length} of {candidates.length} candidate{candidates.length !== 1 ? 's' : ''}
      </p>

      {/* Table */}
      <div className="glass-card overflow-hidden">
        <div className="overflow-x-auto">
          <table className="data-table">
            <thead>
              <tr>
                <th className="w-8">#</th>
                <th
                  className="sortable"
                  onClick={() => handleSort('name')}
                >
                  <div className="flex items-center gap-1">Name <SortIcon col="name" /></div>
                </th>
                <th
                  className="sortable"
                  onClick={() => handleSort('matchScore')}
                >
                  <div className="flex items-center gap-1">Match Score <SortIcon col="matchScore" /></div>
                </th>
                <th>Skills</th>
                <th
                  className="sortable"
                  onClick={() => handleSort('experience')}
                >
                  <div className="flex items-center gap-1">Experience <SortIcon col="experience" /></div>
                </th>
                <th>Category</th>
              </tr>
            </thead>
            <tbody>
              {filtered.map((c, i) => (
                <tr key={c.id}>
                  <td className="text-slate-500 text-xs font-mono">{i + 1}</td>
                  <td>
                    <div>
                      <p className="font-medium text-white truncate max-w-[160px]">{c.name}</p>
                      <p className="text-xs text-slate-500">
                        {new Date(c.timestamp).toLocaleDateString()}
                      </p>
                    </div>
                  </td>
                  <td><MiniBar value={c.matchScore} /></td>
                  <td>
                    <div className="flex flex-wrap gap-1 max-w-[200px]">
                      {c.skills.slice(0, 4).map((s) => (
                        <span key={s} className="skill-neutral">{s}</span>
                      ))}
                      {c.skills.length > 4 && (
                        <span className="skill-neutral">+{c.skills.length - 4}</span>
                      )}
                    </div>
                  </td>
                  <td>
                    <span className="text-sm text-slate-300">
                      {c.experience > 0 ? `${c.experience}y` : '—'}
                    </span>
                  </td>
                  <td>
                    <span className="tag-pill">{c.category}</span>
                  </td>
                </tr>
              ))}

              {filtered.length === 0 && (
                <tr>
                  <td colSpan={6} className="text-center py-10 text-slate-500 text-sm">
                    No candidates match your filters.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  )
}
