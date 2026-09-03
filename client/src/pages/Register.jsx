import { useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { register as apiRegister } from '../services/api';
import { useFingerprint } from '../hooks/useFingerprint';
import { useAuth } from '../context/AuthContext';
import { toast } from 'sonner';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from '@/components/ui/select';
import BoardMark from '../components/board/BoardMark';
import { Fingerprint, Loader2, ShieldAlert } from 'lucide-react';

const DEPARTMENTS = [
  'Computer Science',
  'Electrical Engineering',
  'Mechanical Engineering',
  'Civil Engineering',
  'Information Technology',
  'Mathematics',
  'Physics',
  'Chemistry',
  'Biology',
  'Business Administration',
];

export default function Register() {
  const navigate = useNavigate();
  const { login } = useAuth();
  const { fingerprint, loading: fpLoading } = useFingerprint();

  const [form, setForm] = useState({
    regNumber: '', fullName: '', email: '',
    password: '', confirmPassword: '', department: '',
  });
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  const handleChange = (e) => {
    setForm(prev => ({ ...prev, [e.target.name]: e.target.value }));
    setError('');
  };

  const fail = (msg) => { setError(msg); toast.error(msg); };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!form.department) return fail('Choose a department.');
    if (form.password.length < 6) return fail('Password must be at least 6 characters.');
    if (form.password !== form.confirmPassword) return fail('The two passwords do not match.');

    setLoading(true);
    try {
      const data = await apiRegister({ ...form, fingerprint });
      login({ ...data.user, role: 'student' });
      navigate('/dashboard', { replace: true });
    } catch (err) {
      fail(err.message);
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-board px-5 py-10 sm:px-8 sm:py-14">
      <div className="mx-auto w-full max-w-[560px]">
        <div className="mb-9 flex items-center gap-3">
          <BoardMark size={20} />
          <span className="font-board text-[13px] font-bold uppercase tracking-[0.14em] text-char">
            QR&nbsp;Attend
          </span>
        </div>

        <h1 className="font-board text-2xl font-bold uppercase tracking-[0.04em] text-char">
          Create an account
        </h1>
        <p className="mt-2.5 max-w-[56ch] text-sm leading-relaxed text-char-dim">
          Registration binds this browser to your record. Use the phone you
          will actually be scanning with in class.
        </p>

        <form onSubmit={handleSubmit} id="register-form" className="mt-9 space-y-6">
          <div className="grid gap-6 sm:grid-cols-2">
            <div className="space-y-2.5">
              <Label htmlFor="regNumber">Registration number</Label>
              <Input id="regNumber" name="regNumber" placeholder="2021CS001"
                value={form.regNumber} onChange={handleChange} required />
            </div>
            <div className="space-y-2.5">
              <Label htmlFor="fullName">Full name</Label>
              <Input id="fullName" name="fullName" autoComplete="name" placeholder="Amal Perera"
                value={form.fullName} onChange={handleChange} required />
            </div>
          </div>

          <div className="space-y-2.5">
            <Label htmlFor="email">University email</Label>
            <Input type="email" id="email" name="email" autoComplete="email"
              placeholder="amal.p@stu.uni.edu" value={form.email} onChange={handleChange} required />
          </div>

          <div className="space-y-2.5">
            <Label htmlFor="department">Department</Label>
            <Select value={form.department} onValueChange={(v) => { setForm(p => ({ ...p, department: v })); setError(''); }}>
              <SelectTrigger id="department">
                <SelectValue placeholder="Choose a department" />
              </SelectTrigger>
              <SelectContent>
                {DEPARTMENTS.map(d => <SelectItem key={d} value={d}>{d}</SelectItem>)}
              </SelectContent>
            </Select>
          </div>

          <div className="grid gap-6 sm:grid-cols-2">
            <div className="space-y-2.5">
              <Label htmlFor="password">Password</Label>
              <Input type="password" id="password" name="password" autoComplete="new-password"
                placeholder="At least 6 characters" value={form.password} onChange={handleChange} required />
            </div>
            <div className="space-y-2.5">
              <Label htmlFor="confirmPassword">Confirm password</Label>
              <Input type="password" id="confirmPassword" name="confirmPassword" autoComplete="new-password"
                placeholder="Type it again" value={form.confirmPassword} onChange={handleChange} required />
            </div>
          </div>

          {/* The device being bound, with the id that will be bound. */}
          <div className="border border-slat-edge bg-slat p-4">
            <div className="flex items-start gap-3">
              <Fingerprint className="mt-0.5 size-4 shrink-0 text-amber" strokeWidth={2} />
              <div className="min-w-0 flex-1">
                <div className="font-board text-[10px] font-semibold uppercase tracking-board text-char">
                  Device binding
                </div>
                <p className="mt-1.5 text-[13px] leading-relaxed text-char-dim">
                  This browser becomes your one permitted device. Checking in
                  from another one is refused until a lecturer releases it.
                </p>
                <div className="mt-3 flex items-center gap-2 border-t border-slat-edge pt-3">
                  {fpLoading ? (
                    <>
                      <Loader2 className="size-3.5 shrink-0 animate-spin text-char-dim" />
                      <span className="font-board text-[10px] uppercase tracking-board text-char-dim">
                        Reading device
                      </span>
                    </>
                  ) : fingerprint ? (
                    <>
                      <span className="size-1.5 shrink-0 bg-green" aria-hidden="true" />
                      <span className="font-board text-[10px] font-semibold uppercase tracking-board text-green">
                        Bound
                      </span>
                      <span className="truncate font-board text-[10px] text-char-faint">
                        {fingerprint.slice(0, 16)}…
                      </span>
                    </>
                  ) : (
                    <>
                      <ShieldAlert className="size-3.5 shrink-0 text-amber" strokeWidth={2} />
                      <span className="font-board text-[10px] uppercase tracking-board text-amber">
                        No device id — check-in will be refused
                      </span>
                    </>
                  )}
                </div>
              </div>
            </div>
          </div>

          {error && (
            <p role="alert" className="border border-[hsl(var(--red)/0.32)] bg-[hsl(var(--red)/0.1)] px-3 py-2.5 text-[13px] leading-relaxed text-red">
              {error}
            </p>
          )}

          <Button className="w-full" size="lg" type="submit" disabled={loading} id="register-submit">
            {loading ? 'Creating account' : 'Create account'}
          </Button>
        </form>

        <p className="mt-8 border-t border-slat-edge pt-6 text-sm text-char-dim">
          Already registered?{' '}
          <Link to="/login" className="font-medium text-amber underline underline-offset-4 hover:text-char">
            Sign in
          </Link>
        </p>
      </div>
    </div>
  );
}
