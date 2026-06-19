import { useState, useEffect, useRef } from 'react';
import { useSearchParams } from 'react-router-dom';
import { getSessions } from '../services/api';
import { useSSE } from '../hooks/useSSE';
import { useAuth } from '../context/AuthContext';
import { getToken } from '../services/api';
import { Button } from "@/components/ui/button"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import { Progress } from "@/components/ui/progress"
import { MonitorPlay, ArrowLeft, Loader2, Wifi, WifiOff } from 'lucide-react';

export default function ProjectorView() {
  const { user } = useAuth();
  const [searchParams] = useSearchParams();
  const sessionIdParam = searchParams.get('sessionId');

  const [sessionId, setSessionId] = useState(sessionIdParam || '');
  const [sessions, setSessions] = useState([]);
  const [started, setStarted] = useState(!!sessionIdParam);
  const [countdown, setCountdown] = useState(10);
  const countdownRef = useRef(null);

  const token = getToken();
  const sseUrl = started && sessionId
    ? `/api/qr/stream/${sessionId}?token=${token}`
    : null;

  const { data: qrData, connected } = useSSE(sseUrl);

  // Load available sessions
  useEffect(() => {
    if (user?.role === 'lecturer') {
      getSessions().then(data => {
        const activeSessions = (data.sessions || []).filter(s => s.is_active);
        setSessions(activeSessions);
        if (activeSessions.length === 1 && !sessionIdParam) {
          setSessionId(String(activeSessions[0].id));
        }
      }).catch(console.error);
    }
  }, [user]);

  // Countdown timer
  useEffect(() => {
    if (!qrData?.expiresAt || qrData?.ended) return;

    const updateCountdown = () => {
      const now = Date.now();
      const expires = new Date(qrData.expiresAt).getTime();
      const remaining = Math.max(0, Math.ceil((expires - now) / 1000));
      setCountdown(remaining);
    };

    updateCountdown();
    countdownRef.current = setInterval(updateCountdown, 1000);

    return () => {
      if (countdownRef.current) clearInterval(countdownRef.current);
    };
  }, [qrData?.expiresAt]);

  const refreshInterval = qrData?.refreshInterval || 10000;
  const timerProgress = Math.min(100, (countdown / (refreshInterval / 1000)) * 100);

  // Not started: show session selector
  if (!started) {
    return (
      <div className="min-h-screen bg-zinc-950 flex flex-col items-center justify-center p-6 text-center">
        <div className="max-w-md w-full space-y-8 z-10">
          <div className="flex flex-col items-center">
            <MonitorPlay className="w-20 h-20 text-primary mb-6" />
            <h1 className="text-4xl font-bold text-white tracking-tight mb-2">Projector Mode</h1>
            <p className="text-zinc-400 text-lg">
              Select an active session to display the rotating QR code for your class.
            </p>
          </div>

          {sessions.length > 0 ? (
            <div className="space-y-4 w-full bg-zinc-900/50 p-6 rounded-2xl border border-zinc-800">
              <Select value={sessionId} onValueChange={setSessionId}>
                <SelectTrigger className="w-full bg-zinc-900 border-zinc-700 text-white h-12" id="projector-session-select">
                  <SelectValue placeholder="Select active session..." />
                </SelectTrigger>
                <SelectContent className="bg-zinc-900 border-zinc-800 text-white">
                  {sessions.map(s => (
                    <SelectItem key={s.id} value={s.id.toString()}>
                      {s.course_code} — {s.course_name} ({s.classroom_name})
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <Button
                size="lg"
                className="w-full h-12 text-lg"
                onClick={() => setStarted(true)}
                disabled={!sessionId}
                id="projector-start-btn"
              >
                Display QR Code
              </Button>
            </div>
          ) : (
            <div className="p-4 bg-amber-500/10 border border-amber-500/20 text-amber-500 rounded-xl">
              No active sessions. Start a session from the dashboard first.
            </div>
          )}
        </div>
        
        {/* Decorative background blur */}
        <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[600px] h-[600px] bg-primary/20 blur-[120px] rounded-full pointer-events-none" />
      </div>
    );
  }

  // Active projector display
  const sessionInfo = sessions.find(s => String(s.id) === String(sessionId));

  return (
    <div className="min-h-screen bg-black flex flex-col items-center justify-center p-6 relative overflow-hidden text-center select-none">
      
      {/* Decorative pulse background */}
      <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[600px] h-[600px] bg-primary/10 blur-[100px] rounded-full animate-pulse pointer-events-none" />

      {/* QR Code Display */}
      <div className="relative z-10 bg-white p-8 rounded-[2rem] shadow-2xl transition-opacity duration-500 mb-8" style={{ opacity: qrData?.qr ? 1 : 0.4 }}>
        {qrData?.qr ? (
          <img
            src={qrData.qr}
            alt="Scan this QR code to check in"
            className="w-[400px] h-[400px] object-contain transition-all duration-300"
            draggable="false"
          />
        ) : (
          <div className="w-[400px] h-[400px] flex flex-col items-center justify-center text-zinc-500">
            <Loader2 className="w-12 h-12 animate-spin mb-4 text-primary" />
            <p className="text-xl font-medium">{connected ? 'Generating QR code...' : 'Connecting to server...'}</p>
          </div>
        )}
      </div>

      {/* Session Info */}
      <div className="relative z-10 max-w-2xl text-white">
        <h2 className="text-4xl font-bold tracking-tight mb-2">
          {sessionInfo ? `${sessionInfo.course_code} — ${sessionInfo.course_name}` : 'Loading...'}
        </h2>
        <p className="text-xl text-zinc-400 mb-1">
          {sessionInfo ? `${sessionInfo.classroom_name} • ${sessionInfo.building}` : ''}
        </p>
        <p className="text-lg text-primary font-medium mt-4">
          Scan with your phone camera to check in
        </p>
      </div>

      {/* Timer Display */}
      <div className="absolute bottom-12 w-full max-w-md px-6 z-10 flex flex-col items-center gap-3">
        <Progress value={timerProgress} className="h-2 w-full bg-zinc-800" indicatorClassName="bg-primary transition-all duration-1000 ease-linear" />
        <p className="text-zinc-500 font-mono font-medium tracking-widest">{countdown}s until refresh</p>
      </div>

      {/* Connection Status */}
      <div className="absolute top-8 right-8 z-20 flex items-center gap-2">
        {connected ? (
          <div className="flex items-center gap-2 px-3 py-1.5 bg-emerald-500/10 text-emerald-500 rounded-full border border-emerald-500/20 text-sm font-medium">
            <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
            LIVE
          </div>
        ) : (
          <div className="flex items-center gap-2 px-3 py-1.5 bg-amber-500/10 text-amber-500 rounded-full border border-amber-500/20 text-sm font-medium">
            <WifiOff className="w-4 h-4" />
            Reconnecting...
          </div>
        )}
      </div>

      {/* Exit button */}
      <Button
        variant="ghost"
        className="absolute top-8 left-8 z-20 text-zinc-400 hover:text-white hover:bg-zinc-800"
        onClick={() => setStarted(false)}
        id="projector-exit-btn"
      >
        <ArrowLeft className="w-4 h-4 mr-2" />
        Exit Projector
      </Button>
    </div>
  );
}
