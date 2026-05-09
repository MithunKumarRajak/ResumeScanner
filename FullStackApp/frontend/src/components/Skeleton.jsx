export function SkeletonBlock({ width = '100%', height = 16, rounded = 8, className = '' }) {
  return <div className={`skeleton-shimmer ${className}`} style={{ width, height, borderRadius: rounded }} />
}

export function SkeletonCircle({ size = 40, className = '' }) {
  return <div className={`skeleton-shimmer ${className}`} style={{ width: size, height: size, borderRadius: '50%', flexShrink: 0 }} />
}

export function SkeletonText({ lines = 3, gap = 10, className = '' }) {
  const widths = ['100%', '92%', '78%', '85%', '60%']
  return (
    <div className={className} style={{ display: 'flex', flexDirection: 'column', gap }}>
      {Array.from({ length: lines }).map((_, i) => (
        <SkeletonBlock key={i} width={widths[i % widths.length]} height={12} rounded={6} />
      ))}
    </div>
  )
}

export function SkeletonCard({ className = '' }) {
  return (
    <div className={`glass-card p-6 space-y-4 ${className}`}>
      <div className="flex items-center gap-3">
        <SkeletonCircle size={44} />
        <div className="flex-1 space-y-2">
          <SkeletonBlock width="60%" height={14} />
          <SkeletonBlock width="40%" height={10} />
        </div>
      </div>
      <SkeletonText lines={3} />
      <div className="flex gap-2 pt-1">
        <SkeletonBlock width={80} height={28} rounded={999} />
        <SkeletonBlock width={64} height={28} rounded={999} />
        <SkeletonBlock width={72} height={28} rounded={999} />
      </div>
    </div>
  )
}

export function SkeletonScoreCircle({ size = 120, className = '' }) {
  return (
    <div className={`flex flex-col items-center gap-2 ${className}`}>
      <SkeletonCircle size={size} />
      <SkeletonBlock width={80} height={10} />
    </div>
  )
}

export function SkeletonTableRow({ columns = 4, className = '' }) {
  return (
    <div className={`flex items-center gap-4 px-4 py-3 ${className}`}>
      {Array.from({ length: columns }).map((_, i) => (
        <div key={i} style={{ flex: i === 0 ? 2 : 1 }}>
          <SkeletonBlock width={i === 0 ? '75%' : '60%'} height={12} rounded={6} />
        </div>
      ))}
    </div>
  )
}

export function CandidatePageSkeleton() {
  return (
    <div className="max-w-5xl mx-auto p-4 sm:p-6 lg:p-8 space-y-6 animate-fade-in">
      <div className="space-y-2">
        <SkeletonBlock width={220} height={28} />
        <SkeletonBlock width={320} height={14} />
      </div>
      <div className="flex items-center gap-3">
        {[1, 2, 3, 4].map((i) => (
          <div key={i} className="flex items-center gap-3">
            <SkeletonCircle size={32} />
            {i < 4 && <SkeletonBlock width={48} height={2} />}
          </div>
        ))}
      </div>
      <div className="glass-card p-10 text-center space-y-4">
        <SkeletonCircle size={64} className="mx-auto" />
        <SkeletonBlock width={260} height={16} className="mx-auto" />
        <SkeletonBlock width={200} height={12} className="mx-auto" />
      </div>
    </div>
  )
}

export function ResultPageSkeleton() {
  return (
    <div className="max-w-5xl mx-auto p-4 sm:p-6 lg:p-8 space-y-6 animate-fade-in">
      <div className="glass-card p-6">
        <div className="flex flex-col sm:flex-row items-center gap-6">
          <SkeletonScoreCircle />
          <div className="flex-1 w-full space-y-4">
            <SkeletonBlock width="50%" height={20} />
            <SkeletonBlock width="100%" height={10} />
            <SkeletonBlock width="100%" height={10} />
            <SkeletonBlock width="70%" height={10} />
          </div>
        </div>
      </div>
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        {[1, 2].map((n) => (
          <div key={n} className="glass-card p-5 space-y-3">
            <SkeletonBlock width={140} height={14} />
            <div className="flex flex-wrap gap-2">
              {[70, 90, 60, 80].map((w, i) => (
                <SkeletonBlock key={i} width={w} height={26} rounded={999} />
              ))}
            </div>
          </div>
        ))}
      </div>
    </div>
  )
}

export function DashboardSkeleton() {
  return (
    <div className="max-w-6xl mx-auto p-4 sm:p-6 lg:p-8 space-y-6 animate-fade-in">
      <div className="flex items-center justify-between">
        <div className="space-y-2">
          <SkeletonBlock width={260} height={28} />
          <SkeletonBlock width={180} height={14} />
        </div>
        <SkeletonBlock width={120} height={40} rounded={12} />
      </div>
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        {[1, 2, 3].map((i) => (
          <div key={i} className="glass-card p-5 flex items-center gap-3">
            <SkeletonCircle size={44} />
            <div className="space-y-2 flex-1">
              <SkeletonBlock width="60%" height={18} />
              <SkeletonBlock width="40%" height={10} />
            </div>
          </div>
        ))}
      </div>
      <div className="glass-card overflow-hidden">
        {Array.from({ length: 6 }).map((_, i) => (
          <SkeletonTableRow key={i} columns={4} />
        ))}
      </div>
    </div>
  )
}
