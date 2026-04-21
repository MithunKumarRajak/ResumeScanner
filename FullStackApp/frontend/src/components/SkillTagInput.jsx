import { useState, useRef, useCallback } from 'react'
import { X, Plus } from 'lucide-react'

/**
 * Reusable tag input — type & press Enter/comma to add,
 * click × to remove.
 *
 * Props:
 *   tags       {string[]}  — current tags
 *   onChange   {fn}        — called with new tags array
 *   placeholder {string}
 *   maxTags    {number}
 */
export default function SkillTagInput({
  tags = [],
  onChange,
  placeholder = 'Type and press Enter…',
  maxTags = 30,
}) {
  const [input, setInput] = useState('')
  const inputRef = useRef(null)

  const addTag = useCallback(
    (raw) => {
      const tag = raw.trim().toLowerCase()
      if (!tag || tags.includes(tag) || tags.length >= maxTags) return
      onChange([...tags, tag])
      setInput('')
    },
    [tags, onChange, maxTags]
  )

  const removeTag = useCallback(
    (tag) => onChange(tags.filter((t) => t !== tag)),
    [tags, onChange]
  )

  const onKeyDown = (e) => {
    if (e.key === 'Enter' || e.key === ',') {
      e.preventDefault()
      addTag(input)
    } else if (e.key === 'Backspace' && !input && tags.length) {
      removeTag(tags[tags.length - 1])
    }
  }

  return (
    <div
      className="flex flex-wrap gap-1.5 min-h-[42px] w-full rounded-[12px] border border-[rgba(148,163,184,0.14)] bg-[rgba(15,23,42,0.6)] px-2 py-1.5 transition-all focus-within:border-[rgba(99,102,241,0.5)] focus-within:shadow-[0_0_0_3px_rgba(99,102,241,0.12)] cursor-text"
      onClick={() => inputRef.current?.focus()}
    >
      {tags.map((tag) => (
        <span key={tag} className="tag-pill">
          {tag}
          <button
            type="button"
            className="tag-pill-remove"
            onClick={(e) => { e.stopPropagation(); removeTag(tag) }}
            aria-label={`Remove ${tag}`}
          >
            ×
          </button>
        </span>
      ))}

      <input
        ref={inputRef}
        type="text"
        value={input}
        onChange={(e) => setInput(e.target.value)}
        onKeyDown={onKeyDown}
        onBlur={() => { if (input.trim()) addTag(input) }}
        placeholder={tags.length === 0 ? placeholder : ''}
        className="flex-1 min-w-[120px] bg-transparent text-[0.82rem] text-slate-100 outline-none placeholder:text-slate-500"
        style={{ minWidth: '80px' }}
      />

      {tags.length < maxTags && input.trim() && (
        <button
          type="button"
          onClick={() => addTag(input)}
          className="self-center flex items-center gap-1 text-xs text-indigo-400 hover:text-indigo-300 transition-colors"
        >
          <Plus className="h-3 w-3" />
          Add
        </button>
      )}
    </div>
  )
}
