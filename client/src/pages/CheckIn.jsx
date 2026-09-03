import { useState, useEffect, useCallback, useRef } from 'react';
import { useSearchParams, useNavigate } from 'react-router-dom';
import { checkIn } from '../services/api';
import { useGeolocation } from '../hooks/useGeolocation';
import { useFingerprint } from '../hooks/useFingerprint';
import { useAuth } from '../context/AuthContext';
import { Button } from '@/components/ui/button';
import Flap from '../components/board/Flap';
import StatusFlag from '../components/board/StatusFlag';
import BoardingPass from '../components/board/BoardingPass';

/* The server checks the gates in this order and stops at the first refusal,
   so a rejection at POSITION is proof that TOKEN and DEVICE both passed.
   The ladder says so rather than greying everything out. */
const GATES = [
  { id: 'token_validation',    label: 'Token' },
  { id: 'enrollment_check',    label: 'Enrolment' },
  { id: 'device_verification', label: 'Device' },
  { id: 'geofence_check',      label: 'Position' },
];

const HEADLINE = {
  locating: 'LOCATING',
  checking: 'CHECKING',
  boarded: 'BOARDED',
  reprint: 'ALREADY BOARDED',
  denied: 'DENIED',
};

function GateRow({ label, state, evidence }) {
  const tone = { cleared: 'text-green', denied: 'text-red', checking: 'text-amber' }[state] || 'text-char-faint';
  const verdict = { cleared: 'Cleared', denied: 'Refused', checking: 'Checking', pending: 'Not reached' }[state];

  return (
    <div className="grid grid-cols-[92px_1fr] items-baseline gap-x-3 gap-y-1.5 border-b border-slat-edge py-3 last:border-b-0 sm:grid-cols-[92px_104px_1fr]">
      <span className="font-board text-[10px] font-semibold uppercase tracking-board text-char-dim">
        {label}
      </span>
      <span className={`whitespace-nowrap font-board text-[10px] font-bold uppercase tracking-board ${tone}`}>
        {verdict}
      </span>
      <span className="col-start-2 min-w-0 break-words font-board text-[10px] leading-relaxed text-char-dim sm:col-start-3">
        {evidence || '—'}
      </span>
    </div>
  );
}

export default function CheckIn() {
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const { user } = useAuth();
  const { getPosition, error: gpsError } = useGeolocation();
  const { fingerprint } = useFingerprint();

  const token = searchParams.get('token');

  const [phase, setPhase] = useState(token ? 'locating' : 'denied');
  const [detail, setDetail] = useState(token
    ? ''
    : 'This link carries no code. Scan the QR on the projector rather than opening a saved link.');
  const [failedStep, setFailedStep] = useState(token ? null : 'token_validation');
  const [pass, setPass] = useState(null);
  const [fix, setFix] = useState(null);
  // A GPS failure happens on the phone, before anything is sent. No gate was
  // checked, so none of them may claim to have cleared.
  const [deniedLocally, setDeniedLocally] = useState(false);
  const started = useRef(false);

  const run = useCallback(async () => {
    let position;
    try {
      position = await getPosition();
      setFix(position);
    } catch (err) {
      setPhase('denied');
      setFailedStep('geofence_check');
      setDeniedLocally(true);
      setDetail(err.message);
      return;
    }

    setPhase('checking');
    try {
      const result = await checkIn({
        token,
        latitude: position.latitude,
        longitude: position.longitude,
        fingerprint,
      });
      setPass(result.boardingPass || {});
      setPhase(result.alreadyCheckedIn ? 'reprint' : 'boarded');
    } catch (err) {
      setPhase('denied');
      setFailedStep(err.step || 'token_validation');
      setDeniedLocally(false);
      setDetail(err.message);
    }
  }, [token, fingerprint, getPosition]);

  // The first attempt starts in 'locating' already; only a retry has to
  // clear the previous refusal before running again.
  const retry = useCallback(() => {
    setPhase('locating');
    setDetail('');
    setFailedStep(null);
    setDeniedLocally(false);
    run();
  }, [run]);

  useEffect(() => {
    if (started.current) return;
    if (!token) return;
    if (!user) {
      navigate(`/login?redirect=${encodeURIComponent(`/checkin?token=${token}`)}`, { replace: true });
      return;
    }
    started.current = true;
    run();
  }, [token, user, run, navigate]);

  const settled = phase === 'boarded' || phase === 'reprint';
  const failedIndex = failedStep ? GATES.findIndex(g => g.id === failedStep) : -1;

  const gateState = (i) => {
    if (settled) return 'cleared';
    if (phase === 'denied') {
      if (deniedLocally) return GATES[i].id === 'geofence_check' ? 'denied' : 'pending';
      if (i < failedIndex) return 'cleared';
      if (i === failedIndex) return 'denied';
      return 'pending';
    }
    if (phase === 'checking') return 'checking';
    return GATES[i].id === 'geofence_check' ? 'checking' : 'pending';
  };

  const coords = fix ? `${fix.latitude.toFixed(5)}, ${fix.longitude.toFixed(5)}` : null;
  const gateEvidence = (i) => {
    const id = GATES[i].id;
    const state = gateState(i);
    if (state === 'denied') return detail;
    if (id === 'geofence_check') {
      if (state === 'cleared') return coords ? `${coords} · ±${Math.round(fix.accuracy)}m` : 'inside geofence';
      if (state === 'checking' && phase === 'locating') return 'waiting for a GPS fix';
      return null;
    }
    if (id === 'device_verification' && state === 'cleared') {
      return fingerprint ? `${fingerprint.slice(0, 16)}…` : 'matched on record';
    }
    if (id === 'token_validation' && state === 'cleared') return 'within the rotation window';
    if (id === 'enrollment_check' && state === 'cleared') return 'enrolled in this course';
    return null;
  };

  const tone = settled ? (phase === 'boarded' ? 'clear' : 'now') : phase === 'denied' ? 'deny' : 'now';

  return (
    <div className="min-h-[calc(100vh-3.5rem)] bg-board px-5 py-10 sm:px-6 sm:py-14">
      <div className="mx-auto w-full max-w-2xl">
        {/* the word on the board */}
        <div className="flex flex-wrap items-center justify-between gap-4 border-b border-[hsl(var(--amber)/0.3)] pb-5">
          <Flap
            value={HEADLINE[phase]}
            className={`text-[26px] font-bold tracking-[0.04em] sm:text-4xl ${
              settled ? (phase === 'boarded' ? 'text-green' : 'text-amber') : phase === 'denied' ? 'text-red' : 'text-char'
            }`}
          />
          <StatusFlag tone={tone} live={!settled && phase !== 'denied'}>
            {phase === 'locating' ? 'At the gate' : phase === 'checking' ? 'At the gate' : phase === 'boarded' ? 'Recorded' : phase === 'reprint' ? 'On record' : 'Not recorded'}
          </StatusFlag>
        </div>

        <p className="mt-5 max-w-[62ch] text-[15px] leading-relaxed text-char-dim">
          {phase === 'locating' && 'Allow location access when your browser asks. Nothing is submitted until it has a fix.'}
          {phase === 'checking' && 'Four gates, checked in order. The first refusal stops the rest.'}
          {phase === 'boarded' && 'You are marked present for this session. You can close this page.'}
          {phase === 'reprint' && 'You were already marked present for this session. Nothing was recorded twice.'}
          {phase === 'denied' && detail}
        </p>

        {/* the gate ladder */}
        <div className="mt-8 border border-slat-edge bg-slat px-4 py-1">
          {GATES.map((g, i) => (
            <GateRow key={g.id} label={g.label} state={gateState(i)} evidence={gateEvidence(i)} />
          ))}
        </div>

        {gpsError && phase === 'denied' && (
          <p className="mt-4 border border-[hsl(var(--amber)/0.32)] bg-[hsl(var(--amber)/0.08)] px-3 py-2.5 text-[13px] leading-relaxed text-amber">
            Your browser is blocking location. Enable it for this site in your
            browser settings, then try again — the code on the projector will
            have rotated, so scan the current one.
          </p>
        )}

        {/* the pass */}
        {settled && pass && (
          <div className="mt-10 animate-slat-arrive">
            <BoardingPass
              passenger={user?.full_name}
              regNumber={user?.reg_number}
              courseCode={pass.course_code}
              courseName={pass.course_name}
              classroom={pass.classroom_name}
              building={pass.building}
              checkedInAt={pass.checkedInAt}
              coordinates={coords ? `${coords} · ±${Math.round(fix.accuracy)}m` : null}
              deviceId={fingerprint}
              reprint={phase === 'reprint'}
            />
          </div>
        )}

        <div className="mt-9 flex flex-wrap gap-3">
          {phase === 'denied' && (
            <Button size="lg" onClick={retry} id="retry-checkin-btn">Try again</Button>
          )}
          {settled && (
            <Button variant="outline" size="lg" onClick={() => navigate('/dashboard')} id="goto-dashboard-btn">
              My record
            </Button>
          )}
        </div>
      </div>
    </div>
  );
}
