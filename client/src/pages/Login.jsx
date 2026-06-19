import { useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { login as apiLogin } from '../services/api';
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
import { GraduationCap, User } from 'lucide-react';

export default function Login() {
  const navigate = useNavigate();
  const { login } = useAuth();
  const { fingerprint } = useFingerprint();

  const [form, setForm] = useState({
    identifier: '',
    password: '',
    role: 'student',
  });
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
      toast.success('Login successful!');

      setTimeout(() => {
        navigate(form.role === 'student' ? '/dashboard' : '/lecturer');
      }, 300);
    } catch (err) {
      setError(err.message);
      toast.error(err.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-[calc(100vh-3.5rem)] flex items-center justify-center p-4 bg-muted/40">
      <Card className="w-full max-w-md shadow-lg border-muted">
        <CardHeader className="space-y-2 text-center pb-6">
          <div className="mx-auto bg-primary/10 w-12 h-12 rounded-full flex items-center justify-center mb-2">
            <GraduationCap className="w-6 h-6 text-primary" />
          </div>
          <CardTitle className="text-2xl font-bold tracking-tight">Welcome Back</CardTitle>
          <CardDescription>
            Sign in to your QR Attend account
          </CardDescription>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSubmit} id="login-form" className="space-y-6">
            
            <div className="space-y-3">
              <Label>I am a</Label>
              <div className="grid grid-cols-2 gap-3">
                <Button
                  type="button"
                  variant={form.role === 'student' ? 'default' : 'outline'}
                  onClick={() => setForm(prev => ({ ...prev, role: 'student' }))}
                  id="role-student"
                  className="w-full"
                >
                  <GraduationCap className="w-4 h-4 mr-2" />
                  Student
                </Button>
                <Button
                  type="button"
                  variant={form.role === 'lecturer' ? 'default' : 'outline'}
                  onClick={() => setForm(prev => ({ ...prev, role: 'lecturer' }))}
                  id="role-lecturer"
                  className="w-full"
                >
                  <User className="w-4 h-4 mr-2" />
                  Lecturer
                </Button>
              </div>
            </div>

            <div className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="identifier">
                  {form.role === 'student' ? 'Registration Number' : 'Employee ID'}
                </Label>
                <Input
                  id="identifier"
                  name="identifier"
                  placeholder={form.role === 'student' ? 'e.g. 2021CS001' : 'e.g. LEC001'}
                  value={form.identifier}
                  onChange={handleChange}
                  required
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="password">Password</Label>
                <Input
                  type="password"
                  id="password"
                  name="password"
                  placeholder="Enter your password"
                  value={form.password}
                  onChange={handleChange}
                  required
                />
              </div>
            </div>

            <Button
              className="w-full"
              size="lg"
              type="submit"
              disabled={loading}
              id="login-submit"
            >
              {loading ? 'Signing in...' : 'Sign In'}
            </Button>
          </form>
        </CardContent>
        <CardFooter className="flex justify-center border-t p-6">
          <p className="text-sm text-muted-foreground">
            New student?{' '}
            <Link to="/register" className="text-primary hover:underline font-medium">
              Create an account
            </Link>
          </p>
        </CardFooter>
      </Card>
    </div>
  );
}
