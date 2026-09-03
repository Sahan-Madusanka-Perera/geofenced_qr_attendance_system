/**
 * A flap caught mid-turn: the upper leaf foreshortened and lit, the lower
 * leaf settled. The whole product in one glyph.
 */
export default function BoardMark({ className = '', size = 20 }) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 32 32"
      fill="none"
      className={className}
      aria-hidden="true"
    >
      <rect x="8" y="8" width="16" height="6" className="fill-amber" />
      <rect x="6" y="17" width="20" height="9" className="fill-char" />
      <rect x="4.5" y="15" width="2.5" height="1.6" className="fill-amber" />
      <rect x="25" y="15" width="2.5" height="1.6" className="fill-amber" />
    </svg>
  );
}
