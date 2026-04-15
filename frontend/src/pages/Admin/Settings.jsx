import { Moon, Sun } from 'lucide-react'
import { useTheme } from '../../contexts/ThemeContext'

export default function Settings() {
  const { dark, setDark } = useTheme()

  return (
    <div className="p-4 md:p-6 max-w-2xl mx-auto">
      <div className="mb-6">
        <h1 className="text-xl font-bold text-slate-800">Settings</h1>
        <p className="text-sm text-slate-500 mt-0.5">Manage your portal preferences</p>
      </div>

      {/* Appearance */}
      <div className="bg-white border border-slate-200 rounded-xl overflow-hidden">
        <div className="px-4 py-3 border-b border-slate-100 bg-slate-50">
          <h2 className="text-sm font-semibold text-slate-700 uppercase tracking-wide">Appearance</h2>
        </div>
        <div className="p-4 space-y-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              {dark
                ? <Moon size={18} className="text-accent-500" />
                : <Sun size={18} className="text-accent-500" />
              }
              <div>
                <p className="text-sm font-medium text-slate-800">Dark mode</p>
                <p className="text-xs text-slate-500">Switch between light and dark interface</p>
              </div>
            </div>
            <button
              onClick={() => setDark(d => !d)}
              className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors focus:outline-none focus-visible:ring-2 focus-visible:ring-accent-500 ${dark ? 'bg-accent-500' : 'bg-slate-300'}`}
              aria-label="Toggle dark mode"
            >
              <span
                className={`inline-block h-4 w-4 transform rounded-full bg-white shadow transition-transform ${dark ? 'translate-x-6' : 'translate-x-1'}`}
              />
            </button>
          </div>
        </div>
      </div>
    </div>
  )
}
