import { useState } from 'react';
import { useNavigate, useSearchParams, Link } from 'react-router-dom';
import { login as apiLogin } from '../services/api';
import { useFingerprint } from '../hooks/useFingerprint';
import { useAuth } from '../context/AuthContext';
import { toast } from 'sonner';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import BoardMark from '../components/board/BoardMark';
import { Timer, Crosshair, Fingerprint } from 'lucide-react';

/* The three gates, stated as rules. Every one of these is enforced
   server-side; the panel is describing the system, not decorating it. */
const GATES = [
  {
    icon: Timer,
    label: 'Token',
    rule: 'The code on the projector is re-encrypted every 10 seconds and dies after 15. A screenshot is stale before it can be forwarded.',
  },
  {
    icon: Crosshair,
    label: 'Position',
    rule: 'The room is a polygon in PostGIS. Containment is tested in the database, against a boundary your phone never sees.',
  },
  {
    icon: Fingerprint,
    label: 'Device',
    rule: 'One browser is bound to one student on first check-in. A second device is refused, not silently accepted.',
  },
];

function RoleFlap({ active, onClick, id, children }) {
  return (
    <button
      type="button"
      id={id}
      onClick={onClick}
      aria-pressed={active}
      className={`h-11 border font-board text-[11px] font-semibold uppercase tracking-board transition-colors ${
        active
          ? 'border-amber bg-amber text-board'
          : 'border-slat-edge bg-board text-char-dim hover:border-char-faint hover:text-char'
      }`}
    >
      {children}
    </button>
  );
}

export default function Login() {
  const navigate = useNavigate();
  const [params] = useSearchParams();
  const { login } = useAuth();
  const { fingerprint } = useFingerprint();

  const redirect = params.get('redirect');

  const [form, setForm] = useState({ identifier: '', password: '', role: 'student' });
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  const handleChange = (e) => {
    setForm(prev => ({ ...prev, [e.target.name]: e.target.value }));
    setError('');
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    try {
      const data = await apiLogin({
        ...form,
        fingerprint: form.role === 'student' ? fingerprint : undefined,
      });
      login({ ...data.user, role: form.role });
      // A student who scanned a code while signed out is returned to it.
      navigate(redirect || (form.role === 'student' ? '/dashboard' : '/lecturer'), { replace: true });
    } catch (err) {
      setError(err.message);
      toast.error(err.message);
      setLoading(false);
    }
  };

  return (
    <div className="grid min-h-screen lg:grid-cols-[1.1fr_1fr]">
      {/* the board's identity plate */}
      <aside className="relative hidden flex-col justify-between border-r border-slat-edge bg-board p-10 lg:flex xl:p-14">
        <div className="flex items-center gap-3">
          <BoardMark size={22} />
          <span className="font-board text-[13px] font-bold uppercase tracking-[0.14em] text-char">
            QR&nbsp;Attend
          </span>
        </div>

        <div className="max-w-xl">
          <h2 className="font-board text-4xl font-bold uppercase leading-[1.08] tracking-[-0.02em] text-char xl:text-5xl">
            Attendance
            <br />
            <span className="text-amber">that cannot</span>
            <br />
            be forwarded.
          </h2>
          <p className="mt-6 max-w-[52ch] text-[15px] leading-relaxed text-char-dim">
            A code that expires while you are still reading it, a room boundary
            held in the database, and a device bound to one name. Three gates,
            checked together, every time.
          </p>

          <div className="mt-10 border-t border-slat-edge">
            {GATES.map(({ icon: Icon, label, rule }) => (
              <div key={label} className="flex gap-4 border-b border-slat-edge py-4">
                <Icon className="mt-0.5 size-4 shrink-0 text-amber" strokeWidth={2} />
                <div className="min-w-0">
                  <div className="font-board text-[10px] font-semibold uppercase tracking-board text-char">
                    {label}
                  </div>
                  <p className="mt-1.5 max-w-[58ch] text-[13px] leading-relaxed text-char-dim">
                    {rule}
                  </p>
                </div>
              </div>
            ))}
          </div>
        </div>

        <p className="font-board text-[10px] uppercase tracking-board text-char-dim">
          PostGIS · Server-Sent Events · AES-256-CBC
        </p>
      </aside>

      {/* the form */}
      <main className="flex items-center justify-center bg-slat px-5 py-12 sm:px-10">
        <div className="w-full max-w-[400px]">
          <div className="mb-8 flex items-center gap-3 lg:hidden">
            <BoardMark size={20} />
            <span className="font-board text-[13px] font-bold uppercase tracking-[0.14em] text-char">
              QR&nbsp;Attend
            </span>
          </div>

          <h1 className="font-board text-2xl font-bold uppercase tracking-[0.04em] text-char">
            Sign in
          </h1>
          <p className="mt-2.5 text-sm leading-relaxed text-char-dim">
            Students sign in with a registration number, lecturers with an
            employee ID.
          </p>

          <form onSubmit={handleSubmit} id="login-form" className="mt-8 space-y-6">
            <div className="space-y-2.5">
              <Label>Signing in as</Label>
              <div className="grid grid-cols-2 gap-2">
                <RoleFlap
                  id="role-student"
                  active={form.role === 'student'}
                  onClick={() => setForm(p => ({ ...p, role: 'student' }))}
                >
                  Student
                </RoleFlap>
                <RoleFlap
                  id="role-lecturer"
                  active={form.role === 'lecturer'}
                  onClick={() => setForm(p => ({ ...p, role: 'lecturer' }))}
                >
                  Lecturer
                </RoleFlap>
              </div>
            </div>

            <div className="space-y-2.5">
              <Label htmlFor="identifier">
                {form.role === 'student' ? 'Registration number' : 'Employee ID'}
              </Label>
              <Input
                id="identifier"
                name="identifier"
                autoComplete="username"
                placeholder={form.role === 'student' ? '2021CS001' : 'LEC001'}
                value={form.identifier}
                onChange={handleChange}
                aria-invalid={!!error}
                required
              />
            </div>

            <div className="space-y-2.5">
              <Label htmlFor="password">Password</Label>
              <Input
                type="password"
                id="password"
                name="password"
                autoComplete="current-password"
                placeholder="••••••••"
                value={form.password}
                onChange={handleChange}
                aria-invalid={!!error}
                required
              />
            </div>

            {error && (
              <p role="alert" className="border border-[hsl(var(--red)/0.32)] bg-[hsl(var(--red)/0.1)] px-3 py-2.5 text-[13px] leading-relaxed text-red">
                {error}
              </p>
            )}

            <Button className="w-full" size="lg" type="submit" disabled={loading} id="login-submit">
              {loading ? 'Signing in' : 'Sign in'}
            </Button>
          </form>

          <p className="mt-8 border-t border-slat-edge pt-6 text-sm text-char-dim">
            New student?{' '}
            <Link to="/register" className="font-medium text-amber underline underline-offset-4 hover:text-char">
              Create an account
            </Link>
          </p>
        </div>
      </main>
    </div>
  );
}
