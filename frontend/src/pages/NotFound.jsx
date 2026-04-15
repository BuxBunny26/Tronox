import { Link } from 'react-router-dom'
import { Home, ArrowLeft } from 'lucide-react'

export default function NotFound() {
  return (
    <div className="min-h-screen bg-slate-50 flex flex-col items-center justify-center p-4">
      <div className="text-center">
        <p className="text-6xl font-bold text-brand-700 mb-2">404</p>
        <h1 className="text-xl font-semibold text-slate-800 mb-2">Page Not Found</h1>
        <p className="text-slate-500 text-sm mb-6">
          The page you&#39;re looking for doesn&#39;t exist.
        </p>
        <div className="flex gap-3 justify-center">
          <button onClick={() => window.history.back()}
            className="flex items-center gap-1.5 px-3 py-2 text-sm border border-slate-300 rounded-lg hover:bg-slate-100">
            <ArrowLeft size={14} /> Go Back
          </button>
          <Link to="/dashboard"
            className="flex items-center gap-1.5 px-3 py-2 text-sm bg-brand-700 text-white rounded-lg hover:bg-brand-800">
            <Home size={14} /> Dashboard
          </Link>
        </div>
      </div>
    </div>
  )
}
