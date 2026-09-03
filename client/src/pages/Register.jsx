import { useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { register as apiRegister } from '../services/api';
import { useFingerprint } from '../hooks/useFingerprint';
import { useAuth } from '../context/AuthContext';
import { toast } from 'sonner';
import { Button } from "@/components/ui/button"
import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import { GraduationCap, ShieldCheck, ShieldAlert, Loader2 } from 'lucide-react';

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
    regNumber: '',
    fullName: '',
    email: '',
    password: '',
    confirmPassword: '',
    department: '',
  });
  const [, setError] = useState('');
  const [loading, setLoading] = useState(false);

  const handleChange = (e) => {
    setForm(prev => ({ ...prev, [e.target.name]: e.target.value }));
    setError('');
  };

  const handleSelectChange = (value) => {
    setForm(prev => ({ ...prev, department: value }));
    setError('');
  };

  const handleSubmit = async (e) => {
    e.preventDefault();

    if (form.password !== form.confirmPassword) {
      setError('Passwords do not match');
      toast.error('Passwords do not match');
      return;
    }

    if (form.password.length < 6) {
      setError('Password must be at least 6 characters');
      toast.error('Password must be at least 6 characters');
      return;
    }

    setLoading(true);
    try {
      const data = await apiRegister({
        regNumber: form.regNumber,
        fullName: form.fullName,
        email: form.email,
        password: form.password,
        department: form.department,
        fingerprint,
      });

      login({ ...data.user, role: 'student' });
      toast.success('Registration successful!');
      setTimeout(() => navigate('/dashboard'), 500);
    } catch (err) {
      setError(err.message);
      toast.error(err.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-[calc(100vh-3.5rem)] flex items-center justify-center p-4 bg-muted/40 py-10">
      <Card className="w-full max-w-lg shadow-lg border-muted">
        <CardHeader className="space-y-2 text-center pb-6">
          <div className="mx-auto bg-primary/10 w-12 h-12 rounded-full flex items-center justify-center mb-2">
            <GraduationCap className="w-6 h-6 text-primary" />
          </div>
          <CardTitle className="text-2xl font-bold tracking-tight">Create Account</CardTitle>
          <CardDescription>
            Register with your university details to track attendance
          </CardDescription>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSubmit} id="register-form" className="space-y-5">
            
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="regNumber">Registration Number</Label>
                <Input
                  id="regNumber"
                  name="regNumber"
                  placeholder="e.g. 2021CS001"
                  value={form.regNumber}
                  onChange={handleChange}
                  required
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="fullName">Full Name</Label>
                <Input
                  id="fullName"
                  name="fullName"
                  placeholder="Enter your full name"
                  value={form.fullName}
                  onChange={handleChange}
                  required
                />
              </div>
            </div>

            <div className="space-y-2">
              <Label htmlFor="email">University Email</Label>
              <Input
                type="email"
                id="email"
                name="email"
                placeholder="your.name@stu.uni.edu"
                value={form.email}
                onChange={handleChange}
                required
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="department">Department</Label>
              <Select onValueChange={handleSelectChange} required>
                <SelectTrigger id="department">
                  <SelectValue placeholder="Select department..." />
                </SelectTrigger>
                <SelectContent>
                  {DEPARTMENTS.map(d => (
                    <SelectItem key={d} value={d}>{d}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="password">Password</Label>
                <Input
                  type="password"
                  id="password"
                  name="password"
                  placeholder="Min 6 characters"
                  value={form.password}
                  onChange={handleChange}
                  required
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="confirmPassword">Confirm Password</Label>
                <Input
                  type="password"
                  id="confirmPassword"
                  name="confirmPassword"
                  placeholder="Re-enter password"
                  value={form.confirmPassword}
                  onChange={handleChange}
                  required
                />
              </div>
            </div>

            <div className="flex items-start p-3 bg-muted/50 rounded-md text-sm border">
              <div className="flex-1 space-y-1">
                <div className="flex items-center gap-2 font-medium">
                  🔒 Device Binding
                </div>
                <div className="text-muted-foreground">
                  Your browser will be securely linked to your account.
                </div>
                <div className="pt-1 font-medium">
                  {fpLoading ? (
                    <span className="flex items-center text-muted-foreground">
                      <Loader2 className="w-3 h-3 mr-1 animate-spin" /> Detecting device...
                    </span>
                  ) : fingerprint ? (
                    <span className="flex items-center text-emerald-600 dark:text-emerald-500">
                      <ShieldCheck className="w-3 h-3 mr-1" /> Device detected securely
                    </span>
                  ) : (
                    <span className="flex items-center text-amber-600 dark:text-amber-500">
                      <ShieldAlert className="w-3 h-3 mr-1" /> Could not detect device
                    </span>
                  )}
                </div>
              </div>
            </div>

            <Button
              className="w-full"
              size="lg"
              type="submit"
              disabled={loading}
              id="register-submit"
            >
              {loading ? (
                <>
                  <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                  Creating Account...
                </>
              ) : 'Register'}
            </Button>
          </form>
        </CardContent>
        <CardFooter className="flex justify-center border-t p-6">
          <p className="text-sm text-muted-foreground">
            Already registered?{' '}
            <Link to="/login" className="text-primary hover:underline font-medium">
              Sign in here
            </Link>
          </p>
        </CardFooter>
      </Card>
    </div>
  );
}
