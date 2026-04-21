import { Sun, Moon } from 'lucide-react'
import useStore from '../store'

export default function DarkModeToggle() {
  const darkMode      = useStore((s) => s.darkMode)
  const toggleDarkMode = useStore((s) => s.toggleDarkMode)

  return (
    <button
      onClick={toggleDarkMode}
      type="button"
      aria-label={darkMode ? 'Switch to light mode' : 'Switch to dark mode'}
      className="relative flex h-9 w-9 items-center justify-center rounded-xl border border-[rgba(148,163,184,0.18)] bg-transparent text-slate-400 transition-all hover:border-[rgba(148,163,184,0.32)] hover:text-slate-200 hover:bg-[rgba(148,163,184,0.06)] cursor-pointer"
    >
      {darkMode ? (
        <Sun className="h-4 w-4 transition-all" />
      ) : (
        <Moon className="h-4 w-4 transition-all" />
      )}
    </button>
  )
}
