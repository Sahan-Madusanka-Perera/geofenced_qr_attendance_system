/**
 * The strip across the top of a board: what this board is, and the record
 * it is drawn from. Metadata sits beside the title, never above it.
 */
export default function Masthead({ title, detail, aside, children }) {
  return (
    <header className="border-b border-slat-edge pb-6">
      <div className="flex flex-wrap items-end justify-between gap-x-8 gap-y-4">
        <div className="min-w-0">
          <h1 className="font-board text-2xl font-bold uppercase leading-none tracking-[0.06em] text-char sm:text-[28px]">
            {title}
          </h1>
          {detail && (
            <p className="mt-3 max-w-[60ch] text-sm leading-relaxed text-char-dim">{detail}</p>
          )}
        </div>
        {aside && <div className="flex shrink-0 items-center gap-3">{aside}</div>}
      </div>
      {children}
    </header>
  );
}
