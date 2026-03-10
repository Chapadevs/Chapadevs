/**
 * Ruler-style timeline: phase progress, today marker, sub-step pins (legacy).
 */
function RulerTrack({
  rangeStart,
  rangeEnd,
  rangeMs,
  fillPercent,
  todayPercent,
  subStepMarkers,
  ticks,
  today,
  formatShortDate,
}) {
  return (
    <div className="relative flex flex-col min-w-0 w-full">
      <div className="flex justify-between font-body text-xs text-ink font-medium mb-1">
        <span className="font-heading uppercase tracking-wide">
          {formatShortDate(rangeStart)}
        </span>
        <span className="font-heading uppercase tracking-wide">
          {formatShortDate(rangeEnd)}
        </span>
      </div>
      <div
        className="relative h-10 border border-border overflow-visible bg-surface min-h-[40px]"
        role="img"
        aria-label={`Phase timeline from ${formatShortDate(rangeStart)} to ${formatShortDate(rangeEnd)}`}
      >
        <div
          className="absolute inset-y-0 left-0 bg-primary/25 transition-all duration-300 pointer-events-none"
          style={{ width: `${fillPercent}%` }}
          aria-hidden
        />
        {ticks.map((t, i) => (
          <div
            key={i}
            className="absolute top-0 bottom-0 w-px bg-border"
            style={{ left: `${t.percent}%` }}
            aria-hidden
          />
        ))}
        {todayPercent != null && todayPercent > 0 && todayPercent < 100 && (
          <div
            className="absolute top-0 bottom-0 flex flex-col items-center z-20"
            style={{ left: `${todayPercent}%`, transform: 'translateX(-50%)' }}
          >
            <div
              className="w-1 h-full min-h-[24px] bg-primary"
              title={`Today: ${formatShortDate(today)}`}
            />
            <span className="font-heading text-[10px] text-primary uppercase font-bold mt-0.5 whitespace-nowrap">
              Today
            </span>
          </div>
        )}
        {subStepMarkers.map((m) => (
          <span key={m.id} className="contents">
            {m.startPercent != null && (
              <div
                className="absolute top-0 flex flex-col items-center z-10"
                style={{ left: `${m.startPercent}%`, transform: 'translateX(-50%)' }}
                title={`${m.title} starts ${m.startDate ? formatShortDate(m.startDate) : ''}`}
              >
                <div className="w-1.5 h-5 bg-amber-600 border-l-2 border-amber-700" />
              </div>
            )}
            {m.duePercent != null &&
              (m.startPercent === m.duePercent ? null : (
                <div
                  className="absolute bottom-0 flex flex-col items-center z-10"
                  style={{ left: `${m.duePercent}%`, transform: 'translateX(-50%)' }}
                  title={`${m.title} due ${m.dueDate ? formatShortDate(m.dueDate) : ''}`}
                >
                  <div className="w-1.5 h-5 bg-amber-600 border-r-2 border-amber-700" />
                </div>
              ))}
          </span>
        ))}
      </div>
      <div className="flex flex-wrap gap-x-4 gap-y-0.5 mt-1.5 font-body text-[10px] text-ink-muted">
        {subStepMarkers.length > 0 && (
          <span className="flex items-center gap-1.5">
            <span className="w-1 h-3 bg-amber-600 inline-block" />
            Sub-step dates
          </span>
        )}
        {todayPercent != null && todayPercent > 0 && todayPercent < 100 && (
          <span className="flex items-center gap-1.5">
            <span className="w-0.5 h-3 bg-primary inline-block" />
            Today
          </span>
        )}
      </div>
    </div>
  )
}

export default RulerTrack
