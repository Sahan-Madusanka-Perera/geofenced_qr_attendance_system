/**
 * Attendance against the boarding cutoff.
 *
 * The 80% line is printed on every bar in the system and never moves, so
 * standing is read positionally before it is read as a number or a colour.
 * Clearing the line is CONFIRMED; short of it is STANDBY.
 */
export default function ThresholdBar({
  value = 0,
  threshold = 80,
  height = 'h-2',
  showScale = false,
  className = '',
}) {
  const pct = Math.max(0, Math.min(100, value));
  // Two states only. Amber is reserved for what is happening right now, so
  // a bar can never imply "nearly boarding" when it is simply short.
  const fill = value >= threshold ? 'bg-green' : 'bg-red';

  return (
    <div className={className}>
      <div className={`relative w-full bg-slat-raised ${height}`}>
        {/* Scaled, not resized: a width transition thrashes layout on every
            frame, and a solid block distorts under scaleX by nothing at all. */}
        <div
          className={`h-full w-full origin-left ${fill}`}
          style={{
            transform: `scaleX(${pct / 100})`,
            transition: 'transform 700ms cubic-bezier(0.16, 1, 0.3, 1)',
          }}
        />
        {/* the cutoff, printed across the bar */}
        <div
          className="absolute -top-1 -bottom-1 w-px bg-amber"
          style={{ left: `${threshold}%` }}
          aria-hidden="true"
        />
      </div>
      {showScale && (
        <div className="relative mt-1.5 h-3">
          <span className="absolute left-0 font-board text-[9px] tracking-board text-char-faint">0</span>
          <span
            className="absolute -translate-x-1/2 font-board text-[9px] font-semibold tracking-board text-amber"
            style={{ left: `${threshold}%` }}
          >
            {threshold}
          </span>
          <span className="absolute right-0 font-board text-[9px] tracking-board text-char-faint">100</span>
        </div>
      )}
    </div>
  );
}
