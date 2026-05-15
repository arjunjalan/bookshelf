import { useQuery } from '@tanstack/react-query'
import {
  ResponsiveContainer,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  Tooltip,
} from 'recharts'
import client from '../api/client'

// ─── Helpers ────────────────────────────────────────────────────────────────

function formatMonth(dateStr) {
  // Split to avoid timezone-shift when parsing ISO date strings
  const [year, month] = dateStr.split('-').map(Number)
  return new Date(year, month - 1, 1).toLocaleDateString('en-US', {
    year: 'numeric',
    month: 'short',
  })
}

const BAR_COLOR = '#44403c'       // stone-700
const BAR_COLOR_MUTED = '#a8a29e' // stone-400

// ─── Local sub-components ───────────────────────────────────────────────────

function SkeletonBlock({ height = 'h-48' }) {
  return <div className={`bg-stone-100 rounded-xl animate-pulse ${height}`} />
}

function SectionCard({ title, children }) {
  return (
    <div className="bg-white rounded-xl border border-stone-200 p-5">
      <p className="text-xs font-medium text-stone-400 uppercase tracking-wide mb-4">
        {title}
      </p>
      {children}
    </div>
  )
}

function ChartEmpty({ message }) {
  return (
    <div className="text-center py-10 text-stone-400">
      <p className="text-3xl mb-2">📊</p>
      <p className="text-sm">{message}</p>
    </div>
  )
}

function StoneTooltip({ active, payload, label }) {
  if (!active || !payload?.length) return null
  return (
    <div className="bg-white border border-stone-200 rounded-lg px-3 py-2 shadow-sm text-sm">
      <p className="text-stone-500 text-xs mb-0.5">{label}</p>
      <p className="text-stone-900 font-medium">{payload[0].value}</p>
    </div>
  )
}

// ─── Page ────────────────────────────────────────────────────────────────────

export default function Stats() {
  const {
    data: summary,
    isLoading: summaryLoading,
    isError: summaryError,
  } = useQuery({
    queryKey: ['analytics', 'summary'],
    queryFn: () => client.get('/analytics/summary').then((r) => r.data),
  })

  const {
    data: overTime,
    isLoading: overTimeLoading,
    isError: overTimeError,
  } = useQuery({
    queryKey: ['analytics', 'books-over-time'],
    queryFn: () => client.get('/analytics/books-over-time').then((r) => r.data),
  })

  const {
    data: byGenre,
    isLoading: byGenreLoading,
    isError: byGenreError,
  } = useQuery({
    queryKey: ['analytics', 'by-genre'],
    queryFn: () => client.get('/analytics/by-genre').then((r) => r.data),
  })

  const {
    data: byAuthor,
    isLoading: byAuthorLoading,
    isError: byAuthorError,
  } = useQuery({
    queryKey: ['analytics', 'by-author'],
    queryFn: () => client.get('/analytics/by-author').then((r) => r.data),
  })

  const {
    data: pace,
    isLoading: paceLoading,
    isError: paceError,
  } = useQuery({
    queryKey: ['analytics', 'pace'],
    queryFn: () => client.get('/analytics/pace').then((r) => r.data),
  })

  const totalBooks = summary?.total_books_read ?? '—'
  const avgRating =
    summary?.avg_rating != null ? Number(summary.avg_rating).toFixed(1) : '—'
  const avgDays =
    summary?.avg_days_per_book != null
      ? Math.round(summary.avg_days_per_book)
      : '—'
  const topGenre = summary?.top_genre || '—'

  const overTimeData = (overTime ?? []).map((d) => ({
    ...d,
    monthLabel: formatMonth(d.month),
  }))

  return (
    <div className="flex flex-col gap-8">
      <h2 className="text-xl font-semibold text-stone-900">Reading Stats</h2>

      {/* ── Summary cards ── */}
      {summaryError ? (
        <p className="text-sm text-red-600">Failed to load summary.</p>
      ) : (
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
          {summaryLoading ? (
            <>
              <SkeletonBlock height="h-20" />
              <SkeletonBlock height="h-20" />
              <SkeletonBlock height="h-20" />
              <SkeletonBlock height="h-20" />
            </>
          ) : (
            <>
              <div className="bg-white rounded-xl border border-stone-200 p-5">
                <p className="text-xs text-stone-400 mb-1">Books read</p>
                <p className="text-2xl font-semibold text-stone-900">{totalBooks}</p>
              </div>
              <div className="bg-white rounded-xl border border-stone-200 p-5">
                <p className="text-xs text-stone-400 mb-1">Avg rating</p>
                <p className="text-2xl font-semibold text-stone-900">{avgRating}</p>
              </div>
              <div className="bg-white rounded-xl border border-stone-200 p-5">
                <p className="text-xs text-stone-400 mb-1">Avg days / book</p>
                <p className="text-2xl font-semibold text-stone-900">{avgDays}</p>
              </div>
              <div className="bg-white rounded-xl border border-stone-200 p-5">
                <p className="text-xs text-stone-400 mb-1">Top genre</p>
                <p className="text-2xl font-semibold text-stone-900 truncate">{topGenre}</p>
              </div>
            </>
          )}
        </div>
      )}

      {/* ── Books over time ── */}
      <SectionCard title="Books finished per month">
        {overTimeError && (
          <p className="text-sm text-red-600">Failed to load chart.</p>
        )}
        {overTimeLoading && <SkeletonBlock height="h-48" />}
        {!overTimeLoading && !overTimeError && overTimeData.length === 0 && (
          <ChartEmpty message="No finished books yet — mark some books as read to see your reading history" />
        )}
        {!overTimeLoading && !overTimeError && overTimeData.length > 0 && (
          <ResponsiveContainer width="100%" height={220}>
            <BarChart
              data={overTimeData}
              margin={{ top: 4, right: 0, left: -20, bottom: 0 }}
            >
              <XAxis
                dataKey="monthLabel"
                tick={{ fontSize: 11, fill: '#a8a29e' }}
                tickLine={false}
                axisLine={false}
              />
              <YAxis
                allowDecimals={false}
                tick={{ fontSize: 11, fill: '#a8a29e' }}
                tickLine={false}
                axisLine={false}
              />
              <Tooltip content={<StoneTooltip />} cursor={{ fill: '#f5f5f4' }} />
              <Bar dataKey="books_finished" radius={[4, 4, 0, 0]} fill={BAR_COLOR} />
            </BarChart>
          </ResponsiveContainer>
        )}
      </SectionCard>

      {/* ── By genre ── */}
      <SectionCard title="Books by genre">
        {byGenreError && (
          <p className="text-sm text-red-600">Failed to load chart.</p>
        )}
        {byGenreLoading && <SkeletonBlock height="h-48" />}
        {!byGenreLoading && !byGenreError && (byGenre ?? []).length === 0 && (
          <ChartEmpty message="No genre data yet — add genres to your books to see a breakdown" />
        )}
        {!byGenreLoading && !byGenreError && (byGenre ?? []).length > 0 && (
          <ResponsiveContainer
            width="100%"
            height={Math.max(180, byGenre.length * 36)}
          >
            <BarChart
              data={byGenre}
              layout="vertical"
              margin={{ top: 4, right: 16, left: 8, bottom: 0 }}
            >
              <XAxis
                type="number"
                allowDecimals={false}
                tick={{ fontSize: 11, fill: '#a8a29e' }}
                tickLine={false}
                axisLine={false}
              />
              <YAxis
                type="category"
                dataKey="genre"
                width={96}
                tick={{ fontSize: 11, fill: '#78716c' }}
                tickLine={false}
                axisLine={false}
              />
              <Tooltip content={<StoneTooltip />} cursor={{ fill: '#f5f5f4' }} />
              <Bar dataKey="books_read" radius={[0, 4, 4, 0]} fill={BAR_COLOR} />
            </BarChart>
          </ResponsiveContainer>
        )}
      </SectionCard>

      {/* ── By author ── */}
      <SectionCard title="Books by author">
        {byAuthorError && (
          <p className="text-sm text-red-600">Failed to load chart.</p>
        )}
        {byAuthorLoading && <SkeletonBlock height="h-48" />}
        {!byAuthorLoading && !byAuthorError && (byAuthor ?? []).length === 0 && (
          <ChartEmpty message="No finished books yet — finish some books to see author stats" />
        )}
        {!byAuthorLoading && !byAuthorError && (byAuthor ?? []).length > 0 && (
          <ResponsiveContainer
            width="100%"
            height={Math.max(180, byAuthor.length * 36)}
          >
            <BarChart
              data={byAuthor}
              layout="vertical"
              margin={{ top: 4, right: 16, left: 8, bottom: 0 }}
            >
              <XAxis
                type="number"
                allowDecimals={false}
                tick={{ fontSize: 11, fill: '#a8a29e' }}
                tickLine={false}
                axisLine={false}
              />
              <YAxis
                type="category"
                dataKey="author"
                width={120}
                tick={{ fontSize: 11, fill: '#78716c' }}
                tickLine={false}
                axisLine={false}
              />
              <Tooltip content={<StoneTooltip />} cursor={{ fill: '#f5f5f4' }} />
              <Bar dataKey="books_read" radius={[0, 4, 4, 0]} fill={BAR_COLOR} />
            </BarChart>
          </ResponsiveContainer>
        )}
      </SectionCard>

      {/* ── Pace ── */}
      <SectionCard title="Days to finish each book">
        {paceError && (
          <p className="text-sm text-red-600">Failed to load chart.</p>
        )}
        {paceLoading && <SkeletonBlock height="h-48" />}
        {!paceLoading && !paceError && (pace ?? []).length === 0 && (
          <ChartEmpty message="No pace data yet — books need both a start and end date to appear here" />
        )}
        {!paceLoading && !paceError && (pace ?? []).length > 0 && (
          <ResponsiveContainer
            width="100%"
            height={Math.max(180, pace.length * 36)}
          >
            <BarChart
              data={pace}
              layout="vertical"
              margin={{ top: 4, right: 16, left: 8, bottom: 0 }}
            >
              <XAxis
                type="number"
                allowDecimals={false}
                tick={{ fontSize: 11, fill: '#a8a29e' }}
                tickLine={false}
                axisLine={false}
              />
              <YAxis
                type="category"
                dataKey="title"
                width={140}
                tick={{ fontSize: 11, fill: '#78716c' }}
                tickLine={false}
                axisLine={false}
              />
              <Tooltip content={<StoneTooltip />} cursor={{ fill: '#f5f5f4' }} />
              <Bar dataKey="days_to_finish" radius={[0, 4, 4, 0]} fill={BAR_COLOR_MUTED} />
            </BarChart>
          </ResponsiveContainer>
        )}
      </SectionCard>
    </div>
  )
}
