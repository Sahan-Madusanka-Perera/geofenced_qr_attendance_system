/**
 * A stack of flaps.
 *
 * Columns are fixed cells with a printed head strip; rows are slats
 * separated by a 1px void. A real board sheds columns as the hall narrows
 * rather than sliding sideways, so a column declares its own `hideBelow`
 * and the grid drops its track at that breakpoint — hiding the cell alone
 * would leave the width behind and starve the columns that remain.
 */

const ALIGN = {
  left: 'text-left justify-start',
  right: 'text-right justify-end',
  center: 'text-center justify-center',
};

const HIDE = { sm: 'hidden sm:flex', md: 'hidden md:flex', lg: 'hidden lg:flex' };
const HIDE_HEAD = { sm: 'hidden sm:block', md: 'hidden md:block', lg: 'hidden lg:block' };

// Which breakpoints a column with this `hideBelow` is visible at.
const SHOWS_AT = {
  undefined: { base: true, sm: true, md: true, lg: true },
  sm: { base: false, sm: true, md: true, lg: true },
  md: { base: false, sm: false, md: true, lg: true },
  lg: { base: false, sm: false, md: false, lg: true },
};

function templates(columns) {
  const at = (bp) =>
    columns
      .filter(c => SHOWS_AT[c.hideBelow]?.[bp] ?? true)
      .map(c => c.width || '1fr')
      .join(' ');
  return {
    '--board-cols': at('base'),
    '--board-cols-sm': at('sm'),
    '--board-cols-md': at('md'),
    '--board-cols-lg': at('lg'),
  };
}

export default function Board({
  columns,
  rows,
  rowKey = (_, i) => i,
  empty = null,
  arriving = false,
  onRowClick = null,
  rowLabel = null,
  isRowOpen = null,
  className = '',
}) {
  const cols = templates(columns);

  return (
    <div className={`board border border-slat-edge ${className}`}>
      <div
        className="board-grid items-center gap-x-4 border-b border-[hsl(var(--amber)/0.3)] bg-board px-4 py-2.5"
        style={cols}
      >
        {columns.map(col => (
          <div
            key={col.key}
            className={`board-head truncate ${col.align === 'right' ? 'text-right' : col.align === 'center' ? 'text-center' : 'text-left'} ${col.hideBelow ? HIDE_HEAD[col.hideBelow] : ''}`}
          >
            {col.label}
          </div>
        ))}
      </div>

      {rows.length === 0
        ? empty
        : rows.map((row, i) => {
            const cells = columns.map(col => (
              <div
                key={col.key}
                className={`flex min-w-0 items-center ${ALIGN[col.align || 'left']} ${col.hideBelow ? HIDE[col.hideBelow] : 'flex'} ${col.className || ''}`}
              >
                {col.render(row, i)}
              </div>
            ));

            const arrives = typeof arriving === 'function' ? arriving(row) : arriving;
            const style = {
              ...cols,
              animationDelay: arriving === true ? `${Math.min(i, 12) * 28}ms` : undefined,
            };
            const shared = `slat board-grid items-center gap-x-4 px-4 py-3 text-left ${arrives ? 'animate-slat-arrive' : ''}`;

            // A whole slat is the control, so it has to be a real button.
            return onRowClick ? (
              <button
                key={rowKey(row, i)}
                type="button"
                onClick={() => onRowClick(row, i)}
                aria-expanded={isRowOpen ? isRowOpen(row) : undefined}
                aria-label={rowLabel ? rowLabel(row) : undefined}
                className={`${shared} slat-interactive w-full focus-visible:outline-2 focus-visible:-outline-offset-2 focus-visible:outline-amber`}
                style={style}
              >
                {cells}
              </button>
            ) : (
              <div key={rowKey(row, i)} className={shared} style={style}>
                {cells}
              </div>
            );
          })}
    </div>
  );
}

/** The board with nothing on it. Still a board, still printed. */
export function BoardEmpty({ children, note }) {
  return (
    <div className="slat flex flex-col items-center justify-center gap-2 px-6 py-14 text-center">
      <p className="font-board text-xs font-semibold uppercase tracking-gate text-char-dim">
        {children}
      </p>
      {note && <p className="max-w-sm text-sm text-char-dim">{note}</p>}
    </div>
  );
}
