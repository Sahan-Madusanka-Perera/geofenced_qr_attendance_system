import { useEffect, useRef, useState } from 'react';

const CHARSET = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789';

/* A flap turns in 120ms and the characters behind it swap every 60ms, so
   every other swap happens while the flap is edge-on and invisible. That is
   the whole trick a Solari board plays, and it is why you never actually
   see a character change on one. */
const SWAP_MS = 60;
const CELL_STAGGER = 2; // swaps of delay per cell, left to right
const CELL_TURNS = 5;   // swaps a cell tumbles before it lands

function prefersReducedMotion() {
  return typeof window !== 'undefined'
    && window.matchMedia?.('(prefers-reduced-motion: reduce)').matches;
}

/**
 * A row of split-flap cells.
 *
 * Only cells whose character actually changes are turned — a real board
 * leaves a correct flap alone, which is why a countdown from 10 to 09 turns
 * one flap and not two.
 */
export default function Flap({
  value = '',
  className = '',
  cellClassName = '',
  charset = CHARSET,
  pad = 0,
}) {
  const target = String(value).toUpperCase().padEnd(pad, ' ');
  const [cells, setCells] = useState(() => target.split(''));
  const [turning, setTurning] = useState(() => target.split('').map(() => false));
  const prev = useRef(target);
  const timer = useRef(null);

  useEffect(() => {
    if (prev.current === target) return;

    const from = prev.current;
    prev.current = target;

    if (prefersReducedMotion()) return;

    const chars = target.split('');
    // A flap already showing the right character does not turn.
    const settleAt = chars.map((c, i) =>
      c === from[i] ? 0 : i * CELL_STAGGER + CELL_TURNS
    );
    const last = Math.max(0, ...settleAt);

    let swap = 0;
    clearInterval(timer.current);
    timer.current = setInterval(() => {
      swap += 1;
      setCells(chars.map((c, i) => {
        if (swap >= settleAt[i]) return c;
        if (c === ' ') return ' ';
        return charset[Math.floor(Math.random() * charset.length)];
      }));
      setTurning(chars.map((_, i) => swap < settleAt[i]));
      if (swap > last) {
        clearInterval(timer.current);
        timer.current = null;
        setTurning(chars.map(() => false));
      }
    }, SWAP_MS);

    return () => clearInterval(timer.current);
  }, [target, charset]);

  useEffect(() => () => clearInterval(timer.current), []);

  // With motion suppressed there is nothing to tumble through, so the row
  // renders its target and the interval never starts.
  const shown = prefersReducedMotion() ? target.split('') : cells;

  return (
    <span className={`inline-flex font-board ${className}`} aria-label={String(value)}>
      {shown.map((c, i) => (
        <span
          key={i}
          aria-hidden="true"
          className={`inline-block ${cellClassName}`}
          style={{
            animation: turning[i] ? 'flap-turn 120ms linear infinite' : undefined,
            transformOrigin: 'center center',
          }}
        >
          {c === ' ' ? ' ' : c}
        </span>
      ))}
    </span>
  );
}
