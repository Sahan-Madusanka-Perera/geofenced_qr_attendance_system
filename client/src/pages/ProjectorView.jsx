import { useState, useEffect, useRef } from 'react';
import { useSearchParams, Link } from 'react-router-dom';
import { getSessions, getToken, API_BASE } from '../services/api';
import { useSSE } from '../hooks/useSSE';
import { useAuth } from '../context/AuthContext';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from '@/components/ui/select';
import Flap from '../components/board/Flap';
import StatusFlag from '../components/board/StatusFlag';
import BoardMark from '../components/board/BoardMark';
import { ArrowLeft } from 'lucide-react';

export default function ProjectorView() {
  const { user } = useAuth();
  const [searchParams] = useSearchParams();
  const sessionIdParam = searchParams.get('sessionId');

  const [sessionId, setSessionId] = useState(sessionIdParam || '');
  const [sessions, setSessions] = useState([]);
  const [showing, setShowing] = useState(!!sessionIdParam);
  const [countdown, setCountdown] = useState(0);
  const tick = useRef(null);

  const token = getToken();
  const sseUrl = showing && sessionId ? `${API_BASE}/qr/stream/${sessionId}?token=${token}` : null;
  const { data: qrData, connected } = useSSE(sseUrl);

  useEffect(() => {
    if (user?.role !== 'lecturer') return;
    getSessions()
      .then(data => {
        const live = (data.sessions || []).filter(s => s.is_active);
        setSessions(live);
        if (live.length === 1 && !sessionIdParam) setSessionId(String(live[0].id));
      })
      .catch(() => setSessions([]));
  }, [user, sessionIdParam]);

  useEffect(() => {
    if (!qrData?.expiresAt || qrData?.ended) return;
    const expires = new Date(qrData.expiresAt).getTime();

    const update = () => setCountdown(Math.max(0, Math.ceil((expires - Date.now()) / 1000)));
    update();
    tick.current = setInterval(update, 250);
    return () => clearInterval(tick.current);
  }, [qrData?.expiresAt, qrData?.ended]);

  const session = sessions.find(s => String(s.id) === String(sessionId));
  const ended = qrData?.ended;
  // The bar drains against the token's stated life, not the rotation period:
  // a token outlives a turn so a scan begun just before one still clears.
  const life = qrData?.tokenTtl || 15;
  const remainingPct = Math.min(100, (countdown / life) * 100);

  // ── Picker ────────────────────────────────────────────────────
  if (!showing) {
    return (
      <div className="min-h-[calc(100vh-3.5rem)] bg-board px-5 py-12 sm:px-6">
        <div className="mx-auto w-full max-w-lg">
          <h1 className="font-board text-2xl font-bold uppercase tracking-[0.04em] text-char">
            Projector
          </h1>
          <p className="mt-2.5 max-w-[58ch] text-sm leading-relaxed text-char-dim">
            Throw this on the room screen. The code re-encrypts every ten
            seconds, so a photograph of it is worthless by the time it is sent.
          </p>

          {sessions.length > 0 ? (
            <div className="mt-8 space-y-4 border border-slat-edge bg-slat p-5">
              <div className="space-y-2.5">
                <Label htmlFor="projector-session-select">Session</Label>
                <Select value={sessionId} onValueChange={setSessionId}>
                  <SelectTrigger id="projector-session-select">
                    <SelectValue placeholder="Choose an open session" />
                  </SelectTrigger>
                  <SelectContent>
                    {sessions.map(s => (
                      <SelectItem key={s.id} value={String(s.id)}>
                        {s.course_code} — {s.classroom_name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <Button
                size="lg" className="w-full" disabled={!sessionId}
                onClick={() => setShowing(true)} id="projector-start-btn"
              >
                Display code
              </Button>
            </div>
          ) : (
            <div className="mt-8 border border-slat-edge bg-slat p-8 text-center">
              <p className="font-board text-[11px] font-semibold uppercase tracking-gate text-char-dim">
                No open sessions
              </p>
              <p className="mx-auto mt-3 max-w-sm text-sm leading-relaxed text-char-faint">
                Start a session first — the projector shows the code for a
                session that is already rotating.
              </p>
              <Button variant="outline" size="lg" className="mt-6" asChild>
                <Link to="/lecturer">Go to sessions</Link>
              </Button>
            </div>
          )}
        </div>
      </div>
    );
  }

  // ── The board ─────────────────────────────────────────────────
  return (
    <div className="fixed inset-0 z-[60] flex flex-col bg-board text-char">
      {/* top rail */}
      <div className="flex shrink-0 items-center justify-between gap-4 border-b border-[hsl(var(--amber)/0.25)] px-4 py-3 sm:px-10 sm:py-4">
        <div className="flex min-w-0 items-center gap-3">
          <Button
            variant="ghost"
            size="sm"
            onClick={() => setShowing(false)}
            id="projector-exit-btn"
            className="-ml-2"
          >
            <ArrowLeft className="size-3.5" strokeWidth={2.5} />
            Exit
          </Button>
          <span className="hidden items-center gap-2.5 sm:flex">
            <BoardMark size={18} />
            <span className="font-board text-[12px] font-bold uppercase tracking-[0.14em]">
              QR&nbsp;Attend
            </span>
          </span>
        </div>
        <StatusFlag
          tone={ended ? 'idle' : connected ? 'now' : 'deny'}
          size="md"
          live={connected && !ended}
        >
          {ended ? 'Departed' : connected ? 'Boarding' : 'Reconnecting'}
        </StatusFlag>
      </div>

      {/* the code, and the row it belongs to */}
      <div className="flex min-h-0 flex-1 flex-col items-center justify-center gap-6 overflow-y-auto px-6 py-6 sm:gap-8 sm:py-8 lg:flex-row lg:gap-16 lg:px-16">
        {/* The code sits on white and never animates — it has to stay
            scannable the instant a camera finds it. */}
        <div className={`shrink-0 p-5 sm:p-6 ${ended ? 'bg-slat' : 'bg-pass'}`}>
          {qrData?.qr && !ended ? (
            <img
              src={qrData.qr}
              alt="Scan to check in"
              draggable="false"
              className="size-[min(56vw,44vh,340px)] object-contain lg:size-[min(38vh,420px)]"
            />
          ) : (
            <div className="flex size-[min(56vw,44vh,340px)] items-center justify-center lg:size-[min(38vh,420px)]">
              <span className={`animate-gate-pulse font-board text-[11px] font-semibold uppercase tracking-gate ${ended ? 'text-char-dim' : 'text-pass-fade'}`}>
                {ended ? 'Session closed' : connected ? 'Generating' : 'Connecting'}
              </span>
            </div>
          )}
        </div>

        <div className="min-w-0 text-center lg:text-left">
          <div
            className="font-board font-bold uppercase leading-none tracking-[0.02em] text-char"
            style={{ fontSize: 'clamp(2.5rem, 5.5vw, 6rem)' }}
          >
            {session?.course_code || '——'}
          </div>
          <div className="mt-4 truncate font-board text-lg uppercase tracking-board text-char-dim sm:text-2xl">
            {session?.course_name || ''}
          </div>

          <div className="mt-10 flex flex-wrap items-end justify-center gap-x-14 gap-y-6 lg:justify-start">
            <div>
              <div className="font-board text-[11px] font-semibold uppercase tracking-gate text-amber">
                Gate
              </div>
              <div className="mt-2 font-board text-xl font-bold uppercase tracking-tight sm:text-3xl">
                {session?.classroom_name || '—'}
              </div>
              {session?.building && (
                <div className="mt-1.5 font-board text-[11px] uppercase tracking-board text-char-dim">
                  {session.building}
                </div>
              )}
            </div>

            <div>
              <div className="font-board text-[11px] font-semibold uppercase tracking-gate text-amber">
                Expires
              </div>
              <div className="mt-2 flex items-baseline gap-1.5">
                {/* Sized to read from the back of a lecture hall. */}
                <span
                  className="inline-flex"
                  style={{ fontSize: 'clamp(2rem, 4.5vw, 4.5rem)' }}
                >
                  <Flap
                    value={String(Math.min(99, countdown)).padStart(2, '0')}
                    charset="0123456789"
                    className="font-bold leading-none"
                    cellClassName="w-[0.62em] text-center"
                  />
                </span>
                <span className="font-board text-lg uppercase tracking-board text-char-dim">s</span>
              </div>
            </div>
          </div>

          <p className="mt-10 font-board text-[11px] font-semibold uppercase tracking-gate text-amber sm:text-sm">
            {ended ? 'This session has closed' : 'Scan with your phone camera'}
          </p>
        </div>
      </div>

      {/* the rotation, drawn as it drains */}
      <div className="shrink-0">
        <div className="h-1.5 w-full bg-slat" aria-hidden="true">
          <div
            className={`h-full w-full origin-left ${ended ? 'bg-char-faint' : 'bg-amber'}`}
            style={{
              transform: `scaleX(${(ended ? 100 : remainingPct) / 100})`,
              transition: 'transform 250ms linear',
            }}
          />
        </div>
      </div>
    </div>
  );
}
