import { useNavigate } from 'react-router-dom'
import { Home, ArrowLeft, ScanLine } from 'lucide-react'

export default function NotFoundPage() {
  const navigate = useNavigate()

  return (
    <div className="min-h-[calc(100vh-64px)] flex items-center justify-center px-4 sm:px-6 lg:px-8">
      {/* Asymmetric layout — offset to the left */}
      <div className="max-w-lg w-full animate-slide-up" style={{ marginLeft: '-2%' }}>
        {/* Glitch-style 404 */}
        <div className="relative mb-10">
          <h1
            className="text-[120px] sm:text-[160px] font-black text-transparent leading-none font-display select-none"
            style={{
              WebkitTextStroke: '2px rgba(45,212,168,0.3)',
              letterSpacing: '-0.05em',
            }}
          >
            404
          </h1>
          {/* Overlay text with gradient — offset for glitch feel */}
          <h1
            className="absolute top-1 left-1 text-[120px] sm:text-[160px] font-black leading-none font-display gradient-text select-none"
            style={{
              letterSpacing: '-0.05em',
              opacity: 0.15,
            }}
          >
            404
          </h1>
        </div>

        {/* Text — left aligned, not centered */}
        <h2 className="text-2xl sm:text-3xl font-bold text-[#f0f0f5] mb-3 tracking-tight font-display">
          Page not found
        </h2>
        <p className="text-[#9898a8] text-sm sm:text-base leading-relaxed mb-8 max-w-sm">
          The page you're looking for doesn't exist or has been moved. 
          Let's get you back on track.
        </p>

        {/* Action Buttons */}
        <div className="flex flex-col sm:flex-row items-start gap-3">
          <button
            onClick={() => navigate('/')}
            className="btn-primary flex items-center gap-2 px-6 py-3 text-sm"
            id="not-found-home-btn"
          >
            <Home className="h-4 w-4" />
            Back to Home
          </button>
          <button
            onClick={() => navigate(-1)}
            className="btn-secondary flex items-center gap-2 px-6 py-3 text-sm"
            id="not-found-back-btn"
          >
            <ArrowLeft className="h-4 w-4" />
            Go Back
          </button>
        </div>

        {/* Quick Links — left aligned */}
        <div className="mt-12 pt-8" style={{ borderTop: '1px solid rgba(255,255,255,0.04)' }}>
          <p className="text-[10px] font-semibold text-[#5e5e72] uppercase tracking-wider mb-4 font-display">Quick Links</p>
          <div className="flex flex-wrap gap-2">
            {[
              { label: 'Candidate', path: '/candidate' },
              { label: 'Recruiter', path: '/recruiter' },
              { label: 'AI Generator', path: '/ai-generator' },
              { label: 'Compare', path: '/compare' },
            ].map((link) => (
              <button
                key={link.path}
                onClick={() => navigate(link.path)}
                className="px-3 py-1.5 rounded-lg text-xs font-medium text-[#5e5e72] border border-[rgba(255,255,255,0.06)] hover:border-[rgba(45,212,168,0.2)] hover:text-[#2dd4a8] transition-all cursor-pointer bg-transparent"
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
