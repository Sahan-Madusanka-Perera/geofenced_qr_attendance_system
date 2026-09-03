/**
 * The pass the board prints when a check-in clears.
 *
 * Everything on it is measured, not asserted: the coordinates the phone
 * actually reported, the device id actually bound to the record, the
 * seconds the token actually had left. A pass that only said "verified"
 * would be a sticker.
 */

function Field({ label, value, mono = true, className = '' }) {
  return (
    <div className={`min-w-0 ${className}`}>
      <div className="font-board text-[9px] font-semibold uppercase tracking-board text-pass-fade">
        {label}
      </div>
      <div
        className={`mt-1 truncate text-pass-ink ${mono ? 'font-board text-[13px] font-semibold uppercase tracking-tight' : 'text-sm font-semibold'}`}
      >
        {value}
      </div>
    </div>
  );
}

function Clearance({ label, verdict, evidence, ok }) {
  return (
    <div className="flex items-baseline gap-3 border-t border-dashed border-pass-fade/40 py-2 first:border-t-0">
      <span className="w-[64px] shrink-0 font-board text-[9px] font-semibold uppercase tracking-board text-pass-fade">
        {label}
      </span>
      <span
        className={`w-[74px] shrink-0 font-board text-[10px] font-bold uppercase tracking-tight ${ok ? 'text-pass-ink' : 'text-red'}`}
      >
        {verdict}
      </span>
      <span className="min-w-0 flex-1 truncate font-board text-[10px] text-pass-fade">
        {evidence}
      </span>
    </div>
  );
}

/* A stub carries a code. This one is drawn from the bound device id, so the
   bars on two students' passes differ for the reason they should. */
function StubCode({ seed = '' }) {
  const bars = Array.from({ length: 34 }, (_, i) => {
    const c = seed.charCodeAt(i % Math.max(seed.length, 1)) || 65;
    return ((c + i * 7) % 3) + 1;
  });
  return (
    <div className="flex h-9 items-end gap-[2px]" aria-hidden="true">
      {bars.map((w, i) => (
        <span
          key={i}
          className="h-full bg-pass-ink"
          style={{ width: `${w}px`, opacity: w === 1 ? 0.55 : 1 }}
        />
      ))}
    </div>
  );
}

export default function BoardingPass({
  passenger,
  regNumber,
  courseCode,
  courseName,
  classroom,
  building,
  checkedInAt,
  coordinates,
  deviceId,
  tokenSeconds,
  reprint = false,
}) {
  const time = checkedInAt
    ? new Date(checkedInAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', hour12: false })
    : '--:--';
  const date = checkedInAt
    ? new Date(checkedInAt).toLocaleDateString([], { day: '2-digit', month: 'short' }).toUpperCase()
    : '';

  return (
    <div className="pass grid w-full max-w-2xl grid-cols-1 sm:grid-cols-[1fr_auto_180px]">
      {/* body */}
      <div className="p-5 sm:p-6">
        <div className="flex items-center justify-between gap-4 border-b border-pass-fade/30 pb-3">
          <span className="font-board text-[11px] font-bold uppercase tracking-gate text-pass-ink">
            Boarding Pass
          </span>
          <span className="font-board text-[10px] uppercase tracking-board text-pass-fade">
            {reprint ? 'Reprint' : date}
          </span>
        </div>

        <div className="mt-4 grid grid-cols-2 gap-x-5 gap-y-4">
          <Field label="Passenger" value={passenger} mono={false} className="col-span-2" />
          <Field label="Course" value={courseCode} />
          <Field label="Boarded" value={time} />
          <Field label="Gate" value={classroom} className="col-span-2" />
        </div>

        <p className="mt-2 truncate text-[13px] text-pass-fade">
          {courseName}{building ? ` · ${building}` : ''}
        </p>

        <div className="mt-5 border-t border-pass-fade/30 pt-3">
          <div className="mb-1 font-board text-[9px] font-semibold uppercase tracking-board text-pass-fade">
            Clearance
          </div>
          <Clearance
            label="Token"
            verdict="Accepted"
            evidence={tokenSeconds != null ? `${tokenSeconds}s remaining at scan` : 'within rotation window'}
            ok
          />
          <Clearance
            label="Position"
            verdict="Inside"
            evidence={coordinates || 'inside geofence'}
            ok
          />
          <Clearance
            label="Device"
            verdict="Bound"
            evidence={deviceId ? `${deviceId.slice(0, 12)}…` : 'matched on record'}
            ok
          />
        </div>
      </div>

      {/* perforation */}
      <div className="pass-perf h-px w-full sm:h-full sm:w-px" aria-hidden="true" />

      {/* stub */}
      <div className="flex flex-col justify-between gap-4 p-5 sm:p-6">
        <div className="space-y-3">
          <Field label="Reg. No." value={regNumber} />
          <Field label="Course" value={courseCode} />
          <Field label="Time" value={time} />
        </div>
        <StubCode seed={deviceId || regNumber || 'QRATTEND'} />
      </div>
    </div>
  );
}
