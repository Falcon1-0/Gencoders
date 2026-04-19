import { useMemo, useState } from 'react'
import { PlayCircle, Sparkles } from 'lucide-react'
import { costProfiles, laneAnalytics, questionSuggestions, weeklyTrend } from '../data/mockData.js'
import CostBarChart from '../components/CostBarChart.jsx'
import LaneTable from '../components/LaneTable.jsx'
import MetricCard from '../components/MetricCard.jsx'
import QuestionChips from '../components/QuestionChips.jsx'
import WeeklyTrendChart from '../components/WeeklyTrendChart.jsx'
import { answerCostQuestion, buildCostMetrics } from '../lib/costEngine.js'
import { speakText } from '../lib/voice.js'

function findDriverFromQuestion(question, profiles) {
  const text = question.toLowerCase()
  return profiles.find((profile) => {
    const full = profile.name.toLowerCase()
    const last = full.split(' ').pop()
    return text.includes(full) || text.includes(last.replace('.', '')) || text.includes(last)
  })
}

export default function CostPage({ voiceSettings }) {
  const [question, setQuestion] = useState(questionSuggestions[0])
  const [answer, setAnswer] = useState(() =>
    answerCostQuestion(questionSuggestions[0], costProfiles, laneAnalytics),
  )
  const [focusDriver, setFocusDriver] = useState('K. Johnson')
  const [voiceBusy, setVoiceBusy] = useState(false)
  const [voiceStatus, setVoiceStatus] = useState('')

  const metrics = useMemo(() => buildCostMetrics(costProfiles), [])
  const fleetAverage = useMemo(
    () => costProfiles.reduce((sum, profile) => sum + profile.avgCpm, 0) / costProfiles.length,
    [],
  )

  const chartData = useMemo(() => [...costProfiles].sort((a, b) => a.avgCpm - b.avgCpm), [])

  function ask(newQuestion = question) {
    setQuestion(newQuestion)
    setAnswer(answerCostQuestion(newQuestion, costProfiles, laneAnalytics))
    const matchedDriver = findDriverFromQuestion(newQuestion, costProfiles)
    if (matchedDriver) {
      setFocusDriver(matchedDriver.name)
    }
  }

  async function handleVoice() {
    setVoiceBusy(true)
    try {
      const result = await speakText(answer.speechText || answer.narrative, voiceSettings)
      setVoiceStatus(`Playing via ${result.provider}`)
    } catch (error) {
      setVoiceStatus(error.message)
    } finally {
      setVoiceBusy(false)
    }
  }

  return (
    <div className="space-y-6">
      <section className="grid gap-6 xl:grid-cols-[1.05fr_0.95fr]">
        <div className="panel p-5 md:p-6">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <div>
              <div className="eyebrow">Cost Intelligence</div>
              <h1 className="section-title mt-1">Explain why costs are rising, not just that they are</h1>
            </div>
            <div className="chip">
              <Sparkles size={14} />
              Natural-language analyst
            </div>
          </div>

          <p className="mt-4 max-w-3xl text-sm leading-7 text-command-ink/80">
            COMMAND already has reports and route data. The missing layer is context: which driver, which lane, and which behavior is actually moving cost per mile. This page turns raw CPM into a coachable answer.
          </p>

          <div className="mt-5 space-y-4">
            <QuestionChips
              questions={questionSuggestions}
              onChoose={(selectedQuestion) => ask(selectedQuestion)}
            />

            <div className="panel-muted p-4">
              <label className="data-label">Ask FleetMind</label>
              <textarea
                value={question}
                onChange={(event) => setQuestion(event.target.value)}
                rows={4}
                className="mt-2 w-full resize-none bg-transparent text-base leading-7 text-white outline-none placeholder:text-command-slate"
                placeholder="Why is Johnson's CPM so high this week?"
              />
              <div className="mt-4 flex flex-wrap items-center gap-3">
                <button
                  type="button"
                  onClick={() => ask()}
                  className="rounded-2xl bg-gradient-to-r from-command-blue to-command-cyan px-5 py-3 text-sm font-bold text-white shadow-glow transition hover:scale-[1.01]"
                >
                  Analyze costs
                </button>
                <button
                  type="button"
                  onClick={handleVoice}
                  disabled={voiceBusy}
                  className="chip disabled:opacity-60"
                >
                  <PlayCircle size={14} />
                  {voiceBusy ? 'Playing...' : 'Play voice brief'}
                </button>
                {voiceStatus && <div className="chip">{voiceStatus}</div>}
              </div>
            </div>
          </div>
        </div>

        <div className="panel p-5 md:p-6">
          <div className="eyebrow">Analyst answer</div>
          <h3 className="mt-2 text-2xl font-semibold text-white">{answer.title}</h3>
          <p className="mt-4 text-sm leading-7 text-command-ink/80">{answer.narrative}</p>

          <div className="mt-5 grid gap-3 md:grid-cols-2">
            {answer.metrics.map((metric) => (
              <div key={metric.label} className="panel-muted p-4">
                <div className="data-label">{metric.label}</div>
                <div className="mt-1 text-xl font-semibold text-white">{metric.value}</div>
              </div>
            ))}
          </div>

          <div className="mt-5 grid gap-4 md:grid-cols-2">
            <div className="rounded-2xl border border-white/10 bg-white/[0.03] p-4">
              <div className="data-label">What the data says</div>
              <ul className="mt-3 space-y-2 text-sm leading-7 text-command-ink/80">
                {answer.bullets.map((bullet) => (
                  <li key={bullet}>• {bullet}</li>
                ))}
              </ul>
            </div>
            <div className="rounded-2xl border border-command-cyan/20 bg-command-cyan/5 p-4">
              <div className="data-label">What to do next</div>
              <ul className="mt-3 space-y-2 text-sm leading-7 text-command-ink/80">
                {answer.actions.map((action) => (
                  <li key={action}>• {action}</li>
                ))}
              </ul>
            </div>
          </div>
        </div>
      </section>

      <section className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
        {metrics.map((metric, index) => (
          <MetricCard
            key={metric.label}
            {...metric}
            tone={index === 2 ? 'red' : index === 3 ? 'green' : 'cyan'}
          />
        ))}
      </section>

      <section className="grid gap-6 xl:grid-cols-2">
        <CostBarChart data={chartData} fleetAverage={fleetAverage} />
        <WeeklyTrendChart data={weeklyTrend} focusDriver={focusDriver} />
      </section>

      <LaneTable lanes={laneAnalytics} />
    </div>
  )
}
