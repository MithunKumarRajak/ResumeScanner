import { useNavigate } from 'react-router-dom'
import { Home, ArrowLeft, Search, ScanLine } from 'lucide-react'

export default function NotFoundPage() {
  const navigate = useNavigate()

  return (
    <div className="min-h-[calc(100vh-64px)] flex items-center justify-center px-4 sm:px-6 lg:px-8">
      <div className="text-center max-w-lg animate-slide-up">
        {/* Animated 404 Icon */}
        <div className="relative mx-auto mb-8 w-40 h-40">
          {/* Outer glow ring */}
          <div className="absolute inset-0 rounded-full bg-gradient-to-br from-indigo-500/20 to-violet-500/20 blur-2xl animate-pulse" />
          
          {/* Main circle */}
          <div className="relative flex items-center justify-center w-full h-full">
            <div className="absolute inset-2 rounded-full border border-dashed border-slate-700/60 animate-[spin_25s_linear_infinite]" />
            <div className="absolute inset-5 rounded-full border border-slate-800/50" />
            <div className="z-10 flex flex-col items-center">
              <span className="text-6xl font-black text-white tracking-tighter leading-none" style={{ fontFamily: 'Inter, system-ui, sans-serif' }}>
                4<span className="inline-block animate-bounce" style={{ animationDuration: '2s' }}>0</span>4
              </span>
            </div>
          </div>
        </div>

        {/* Text */}
        <h1 className="text-2xl sm:text-3xl font-extrabold text-white mb-3 tracking-tight">
          Page Not Found
        </h1>
        <p className="text-slate-400 text-sm sm:text-base leading-relaxed mb-8 max-w-sm mx-auto">
          The page you're looking for doesn't exist or has been moved. 
          Let's get you back on track.
        </p>

        {/* Action Buttons */}
        <div className="flex flex-col sm:flex-row items-center justify-center gap-3">
          <button
            onClick={() => navigate('/')}
            className="btn-primary flex items-center gap-2 px-6 py-3 text-sm w-full sm:w-auto justify-center"
            id="not-found-home-btn"
          >
            <Home className="h-4 w-4" />
            Back to Home
          </button>
          <button
            onClick={() => navigate(-1)}
            className="btn-secondary flex items-center gap-2 px-6 py-3 text-sm w-full sm:w-auto justify-center"
            id="not-found-back-btn"
          >
            <ArrowLeft className="h-4 w-4" />
            Go Back
          </button>
        </div>

        {/* Quick Links */}
        <div className="mt-10 pt-8 border-t border-slate-800/50">
          <p className="text-xs font-semibold text-slate-500 uppercase tracking-wider mb-4">Quick Links</p>
          <div className="flex flex-wrap justify-center gap-2">
            {[
              { label: 'Candidate', path: '/candidate', icon: ScanLine },
              { label: 'Recruiter', path: '/recruiter', icon: Search },
              { label: 'AI Generator', path: '/ai-generator', icon: Search },
              { label: 'Compare', path: '/compare', icon: Search },
            ].map((link) => (
              <button
                key={link.path}
                onClick={() => navigate(link.path)}
                className="px-3 py-1.5 rounded-lg text-xs font-medium text-slate-400 border border-slate-800 hover:border-slate-700 hover:text-slate-200 hover:bg-slate-800/40 transition-all cursor-pointer bg-transparent"
              >
                {link.label}
              </button>
            ))}
          </div>
        </div>
      </div>
    </div>
  )
}
