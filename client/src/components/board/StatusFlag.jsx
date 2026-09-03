import Flap from './Flap';

/* The board says four things about anything: it is happening now, it
   cleared, it was denied, or it is merely scheduled. Everything in this
   product reduces to one of those. */
const TONES = {
  now:   'text-amber   bg-[hsl(var(--amber)/0.12)] border-[hsl(var(--amber)/0.35)]',
  clear: 'text-green   bg-[hsl(var(--green)/0.12)] border-[hsl(var(--green)/0.32)]',
  deny:  'text-red     bg-[hsl(var(--red)/0.12)]   border-[hsl(var(--red)/0.32)]',
  idle:  'text-char-dim bg-slat-raised             border-slat-edge',
};

const SIZES = {
  sm: 'h-[22px] px-2 text-[10px] tracking-board',
  md: 'h-7 px-2.5 text-[11px] tracking-board',
  lg: 'h-9 px-4 text-sm tracking-gate',
};

export default function StatusFlag({
  children,
  tone = 'idle',
  size = 'sm',
  live = false,
  flap = false,
  className = '',
}) {
  const label = String(children);

  return (
    <span
      className={`inline-flex shrink-0 items-center gap-2 border font-board font-semibold uppercase leading-none ${TONES[tone]} ${SIZES[size]} ${className}`}
    >
      {live && (
        <span
          className="size-1.5 shrink-0 animate-gate-pulse bg-current"
          aria-hidden="true"
        />
      )}
      {flap ? <Flap value={label} /> : label}
    </span>
  );
}
