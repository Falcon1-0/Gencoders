export default function MetricCard({ label, value, hint, tone = 'cyan' }) {
  const toneClasses = {
    cyan: 'from-command-blue/20 to-command-cyan/10 border-command-cyan/20',
    green: 'from-command-green/20 to-transparent border-command-green/20',
    amber: 'from-command-amber/20 to-transparent border-command-amber/20',
    red: 'from-command-red/20 to-transparent border-command-red/20',
  }

  return (
    <div className={`panel bg-gradient-to-br ${toneClasses[tone] || toneClasses.cyan} p-5`}>
      <div className="data-label">{label}</div>
      <div className="mt-2 text-3xl font-semibold text-white">{value}</div>
      <p className="mt-2 text-sm leading-6 text-command-ink/70">{hint}</p>
    </div>
  )
}
