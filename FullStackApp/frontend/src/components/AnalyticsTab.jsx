import { 
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip as RechartsTooltip, Legend, ResponsiveContainer,
  PieChart, Pie, Cell, LineChart, Line, AreaChart, Area
} from 'recharts'
import { Loader2, AlertCircle } from 'lucide-react'
import {
  useSkillDemand,
  useSkillSupply,
  useMatchDistribution,
  useCategoryBreakdown,
  useExperienceDistribution,
  useTopCandidates
} from '../hooks/useAnalytics'

const COLORS = ['#6366f1', '#8b5cf6', '#ec4899', '#14b8a6', '#f59e0b', '#3b82f6', '#10b981', '#f43f5e']

export default function AnalyticsTab() {
  const { data: demandData, isLoading: loadingDemand, isError: errDemand } = useSkillDemand()
  const { data: supplyData, isLoading: loadingSupply, isError: errSupply } = useSkillSupply()
  const { data: matchData, isLoading: loadingMatch, isError: errMatch } = useMatchDistribution()
  const { data: categoryData, isLoading: loadingCat, isError: errCat } = useCategoryBreakdown()
  const { data: expData, isLoading: loadingExp, isError: errExp } = useExperienceDistribution()
  const { data: topCandidates, isLoading: loadingTop, isError: errTop } = useTopCandidates(5)

  const isLoading = loadingDemand || loadingSupply || loadingMatch || loadingCat || loadingExp || loadingTop
  const isError = errDemand || errSupply || errMatch || errCat || errExp || errTop

  if (isLoading) {
    return (
      <div className="flex flex-col items-center justify-center p-12 text-slate-400">
        <Loader2 className="h-8 w-8 animate-spin text-indigo-400 mb-4" />
        <p>Loading analytics data...</p>
      </div>
    )
  }

  if (isError) {
    return (
      <div className="flex flex-col items-center justify-center p-12 text-red-400">
        <AlertCircle className="h-8 w-8 mb-4" />
        <p>Failed to load analytics data.</p>
      </div>
    )
  }

  return (
    <div className="space-y-6">
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        
        {/* Category Breakdown - Pie Chart */}
        <div className="glass-card p-5">
          <h3 className="text-sm font-bold text-white mb-4">Resume Categories</h3>
          <div className="h-[300px]">
            <ResponsiveContainer width="100%" height="100%">
              <PieChart>
                <Pie
                  data={categoryData}
                  cx="50%" cy="50%"
                  innerRadius={60} outerRadius={100}
                  paddingAngle={5}
                  dataKey="count"
                  nameKey="category"
                  label={({name, percent}) => `${name} ${(percent * 100).toFixed(0)}%`}
                >
                  {categoryData?.map((entry, index) => (
                    <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                  ))}
                </Pie>
                <RechartsTooltip 
                  contentStyle={{ backgroundColor: '#1e293b', borderColor: '#334155', color: '#f8fafc' }}
                  itemStyle={{ color: '#cbd5e1' }}
                />
              </PieChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* Experience Distribution - Bar Chart */}
        <div className="glass-card p-5">
          <h3 className="text-sm font-bold text-white mb-4">Experience Distribution</h3>
          <div className="h-[300px]">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={expData} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="#334155" vertical={false} />
                <XAxis dataKey="range_label" stroke="#94a3b8" fontSize={12} tickLine={false} axisLine={false} />
                <YAxis stroke="#94a3b8" fontSize={12} tickLine={false} axisLine={false} />
                <RechartsTooltip 
                  cursor={{ fill: '#334155', opacity: 0.4 }}
                  contentStyle={{ backgroundColor: '#1e293b', borderColor: '#334155', color: '#f8fafc' }}
                />
                <Bar dataKey="count" fill="#14b8a6" radius={[4, 4, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* Match Score Distribution - Area Chart */}
        <div className="glass-card p-5 md:col-span-2">
          <h3 className="text-sm font-bold text-white mb-4">Match Score Distribution</h3>
          <div className="h-[300px]">
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart data={matchData} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
                <defs>
                  <linearGradient id="colorMatch" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#8b5cf6" stopOpacity={0.8}/>
                    <stop offset="95%" stopColor="#8b5cf6" stopOpacity={0}/>
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" stroke="#334155" vertical={false} />
                <XAxis dataKey="bucket" stroke="#94a3b8" fontSize={12} tickLine={false} axisLine={false} />
                <YAxis stroke="#94a3b8" fontSize={12} tickLine={false} axisLine={false} />
                <RechartsTooltip 
                  contentStyle={{ backgroundColor: '#1e293b', borderColor: '#334155', color: '#f8fafc' }}
                />
                <Area type="monotone" dataKey="count" stroke="#8b5cf6" fillOpacity={1} fill="url(#colorMatch)" />
              </AreaChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* Skill Demand - Bar Chart */}
        <div className="glass-card p-5">
          <h3 className="text-sm font-bold text-white mb-4">Top Skill Demand (Jobs)</h3>
          <div className="h-[300px]">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart layout="vertical" data={demandData?.slice(0, 10)} margin={{ top: 0, right: 10, left: 20, bottom: 0 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="#334155" horizontal={false} />
                <XAxis type="number" stroke="#94a3b8" fontSize={12} tickLine={false} axisLine={false} />
                <YAxis dataKey="skill" type="category" stroke="#e2e8f0" fontSize={11} tickLine={false} axisLine={false} width={80} />
                <RechartsTooltip 
                  cursor={{ fill: '#334155', opacity: 0.4 }}
                  contentStyle={{ backgroundColor: '#1e293b', borderColor: '#334155', color: '#f8fafc' }}
                />
                <Bar dataKey="demand_count" fill="#3b82f6" radius={[0, 4, 4, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* Skill Supply - Bar Chart */}
        <div className="glass-card p-5">
          <h3 className="text-sm font-bold text-white mb-4">Top Skill Supply (Resumes)</h3>
          <div className="h-[300px]">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart layout="vertical" data={supplyData?.slice(0, 10)} margin={{ top: 0, right: 10, left: 20, bottom: 0 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="#334155" horizontal={false} />
                <XAxis type="number" stroke="#94a3b8" fontSize={12} tickLine={false} axisLine={false} />
                <YAxis dataKey="skill" type="category" stroke="#e2e8f0" fontSize={11} tickLine={false} axisLine={false} width={80} />
                <RechartsTooltip 
                  cursor={{ fill: '#334155', opacity: 0.4 }}
                  contentStyle={{ backgroundColor: '#1e293b', borderColor: '#334155', color: '#f8fafc' }}
                />
                <Bar dataKey="supply_count" fill="#f43f5e" radius={[0, 4, 4, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>

      </div>

      {/* Top Candidates Table */}
      <div className="glass-card p-5">
        <h3 className="text-sm font-bold text-white mb-4">Top Candidates Pipeline</h3>
        <div className="overflow-x-auto">
          <table className="w-full text-sm text-left text-slate-300">
            <thead className="text-xs uppercase bg-slate-800/50 text-slate-400">
              <tr>
                <th className="px-4 py-3 rounded-tl-lg">Candidate</th>
                <th className="px-4 py-3">Category</th>
                <th className="px-4 py-3">Matches</th>
                <th className="px-4 py-3">Avg Score</th>
                <th className="px-4 py-3 rounded-tr-lg">Best Score</th>
              </tr>
            </thead>
            <tbody>
              {topCandidates?.map((candidate, idx) => (
                <tr key={candidate.resume_id} className="border-b border-slate-700/50 hover:bg-slate-800/30">
                  <td className="px-4 py-3 font-medium text-white">{candidate.name}</td>
                  <td className="px-4 py-3">{candidate.predicted_category || 'N/A'}</td>
                  <td className="px-4 py-3">{candidate.match_count}</td>
                  <td className="px-4 py-3">
                    <span className={`px-2 py-1 rounded text-xs font-semibold ${
                      candidate.avg_score >= 80 ? 'bg-emerald-500/10 text-emerald-400' :
                      candidate.avg_score >= 50 ? 'bg-amber-500/10 text-amber-400' :
                      'bg-red-500/10 text-red-400'
                    }`}>
                      {candidate.avg_score.toFixed(1)}%
                    </span>
                  </td>
                  <td className="px-4 py-3">{candidate.best_score.toFixed(1)}%</td>
                </tr>
              ))}
              {topCandidates?.length === 0 && (
                <tr>
                  <td colSpan="5" className="px-4 py-8 text-center text-slate-500">No candidates analyzed yet.</td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>

    </div>
  )
}
