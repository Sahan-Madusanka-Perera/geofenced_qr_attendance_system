import { Link, useLocation, useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import BoardMark from './board/BoardMark';
import { Button } from '@/components/ui/button';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { LogOut, Map, MonitorPlay, CalendarRange, LayoutList } from 'lucide-react';

const LINKS = {
  student: [{ to: '/dashboard', label: 'Record', icon: LayoutList }],
  lecturer: [
    { to: '/lecturer', label: 'Sessions', icon: CalendarRange },
    { to: '/projector', label: 'Projector', icon: MonitorPlay },
    { to: '/geofence', label: 'Gates', icon: Map },
  ],
};

function NavLink({ to, label, icon: Icon, active }) {
  return (
    <Link
      to={to}
      aria-current={active ? 'page' : undefined}
      className={`relative flex h-14 items-center gap-2 px-3 font-board text-[10px] font-semibold uppercase tracking-board transition-colors ${
        active ? 'text-amber' : 'text-char-dim hover:text-char'
      }`}
    >
      <Icon className="size-3.5" strokeWidth={2} />
      {label}
      {active && <span className="absolute inset-x-2 bottom-0 h-0.5 bg-amber" />}
    </Link>
  );
}

export default function Navbar() {
  const { user, logout } = useAuth();
  const location = useLocation();
  const navigate = useNavigate();

  if (!user) return null;

  const links = LINKS[user.role] || [];
  const initials = user.full_name
    ? user.full_name.split(' ').map(n => n[0]).join('').slice(0, 2).toUpperCase()
    : '--';

  const handleLogout = () => {
    logout();
    navigate('/login');
  };

  return (
    <nav className="sticky top-0 z-50 w-full border-b border-[hsl(var(--amber)/0.25)] bg-board/95 backdrop-blur">
      <div className="mx-auto flex h-14 max-w-[1400px] items-center gap-1 px-4 sm:px-6">
        <Link to="/" className="mr-4 flex shrink-0 items-center gap-2.5">
          <BoardMark size={18} />
          <span className="font-board text-[13px] font-bold uppercase tracking-[0.14em] text-char">
            QR&nbsp;Attend
          </span>
        </Link>

        <div className="hidden sm:flex">
          {links.map(l => (
            <NavLink key={l.to} {...l} active={location.pathname === l.to} />
          ))}
        </div>

        <div className="ml-auto flex items-center gap-3">
          <span className="hidden font-board text-[10px] uppercase tracking-board text-char-dim md:inline">
            {user.full_name}
          </span>
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button
                variant="outline"
                size="icon-sm"
                aria-label="Account"
                className="text-[10px] tracking-tight"
              >
                {initials}
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent className="w-60" align="end">
              <DropdownMenuLabel className="font-normal">
                <div className="space-y-1 py-1">
                  <p className="font-board text-[11px] font-semibold uppercase tracking-tight text-char">
                    {user.full_name}
                  </p>
                  <p className="truncate text-xs text-char-dim">{user.email}</p>
                </div>
              </DropdownMenuLabel>
              <DropdownMenuSeparator />
              <DropdownMenuItem onClick={handleLogout} className="cursor-pointer text-red focus:text-red">
                <LogOut className="mr-2 size-4" />
                Sign out
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
      </div>

      {/* A board that narrows sheds columns, not destinations. */}
      {links.length > 0 && (
        <div className="flex border-t border-slat-edge sm:hidden">
          {links.map(l => {
            const active = location.pathname === l.to;
            return (
              <Link
                key={l.to}
                to={l.to}
                aria-current={active ? 'page' : undefined}
                className={`relative flex flex-1 items-center justify-center gap-1.5 py-2.5 font-board text-[10px] font-semibold uppercase tracking-board ${
                  active ? 'text-amber' : 'text-char-dim'
                }`}
              >
                <l.icon className="size-3.5" strokeWidth={2} />
                {l.label}
                {active && <span className="absolute inset-x-3 bottom-0 h-0.5 bg-amber" />}
              </Link>
            );
          })}
        </div>
      )}
    </nav>
  );
}
