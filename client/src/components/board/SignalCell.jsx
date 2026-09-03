import { Check, X, Minus } from 'lucide-react';

/**
 * One verification signal, lit or unlit.
 *
 * An unlit cell is drawn, not omitted — a check-in with no device signal
 * looks different from one that failed, and both look different from a
 * session that was never attended.
 */
const STATES = {
  on: {
    cls: 'border-[hsl(var(--green)/0.4)] bg-[hsl(var(--green)/0.12)] text-green',
    word: 'verified',
    Icon: Check,
  },
  fail: {
    cls: 'border-[hsl(var(--red)/0.35)] bg-[hsl(var(--red)/0.1)] text-red',
    word: 'not verified',
    Icon: X,
  },
  off: {
    cls: 'border-slat-edge bg-board text-char-faint',
    word: 'not attempted',
    Icon: Minus,
  },
};

export default function SignalCell({ on, off = false, label }) {
  const { cls, word, Icon } = STATES[off ? 'off' : on ? 'on' : 'fail'];

  return (
    <span
      className={`inline-flex size-5 items-center justify-center border ${cls}`}
      title={`${label}: ${word}`}
    >
      <span className="sr-only">{`${label} ${word}`}</span>
      <Icon className="size-3" strokeWidth={2.75} aria-hidden="true" />
    </span>
  );
}
