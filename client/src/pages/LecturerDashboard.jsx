import { useState, useEffect, useCallback, useRef } from 'react';
import { Link } from 'react-router-dom';
import {
  getLecturerCourses, getClassrooms, createSession, stopSession,
  getSessions, getAttendees, getCourseStats, downloadCSV, downloadExcel,
} from '../services/api';
import { useAuth } from '../context/AuthContext';
import { toast } from 'sonner';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from '@/components/ui/select';
import { Skeleton } from '@/components/ui/skeleton';
import Masthead from '../components/board/Masthead';
import Board, { BoardEmpty } from '../components/board/Board';
import StatusFlag from '../components/board/StatusFlag';
import ThresholdBar from '../components/board/ThresholdBar';
import SignalCell from '../components/board/SignalCell';
import Flap from '../components/board/Flap';
import { Play, Square, MonitorPlay, BarChart3, Download } from 'lucide-react';

const THRESHOLD = 80;
const POLL_MS = 5000;

function Field({ label, value, tone = 'text-char' }) {
  return (
    <div className="min-w-0">
      <div className="font-board text-[10px] font-semibold uppercase tracking-board text-char-dim">
        {label}
      </div>
      <div className={`mt-1.5 truncate font-board text-[13px] font-bold uppercase tracking-tight ${tone}`}>
        {value}
      </div>
    </div>
  );
}

export default function LecturerDashboard() {
  const { user } = useAuth();
  const [courses, setCourses] = useState([]);
  const [classrooms, setClassrooms] = useState([]);
  const [selectedCourse, setSelectedCourse] = useState('');
  const [selectedClassroom, setSelectedClassroom] = useState('');
  const [activeSession, setActiveSession] = useState(null);
  const [attendees, setAttendees] = useState([]);
  const [statsFor, setStatsFor] = useState(null);
  const [courseStats, setCourseStats] = useState([]);
  const [loading, setLoading] = useState(true);
  const [starting, setStarting] = useState(false);

  // Rows that were not on the board on the previous poll flap in; the rest
  // hold still, so arrival is what moves.
  const seen = useRef(new Set());
  const [fresh, setFresh] = useState(new Set());

  const applyAttendees = useCallback((list) => {
    const next = new Set();
    list.forEach(a => { if (!seen.current.has(a.reg_number)) next.add(a.reg_number); });
    list.forEach(a => seen.current.add(a.reg_number));
    setFresh(next);
    setAttendees(list);
  }, []);

  const refresh = useCallback(async () => {
    try {
      const [c, r, s] = await Promise.all([getLecturerCourses(), getClassrooms(), getSessions()]);
      setCourses(c.courses || []);
      setClassrooms(r.classrooms || []);
      const active = (s.sessions || []).find(x => x.is_active) || null;
      setActiveSession(active);
      if (active) {
        const att = await getAttendees(active.id);
        applyAttendees(att.attendees || []);
      } else {
        seen.current = new Set();
        setAttendees([]);
      }
    } catch (err) {
      toast.error(err.message);
    } finally {
      setLoading(false);
    }
  }, [applyAttendees]);

  useEffect(() => {
    let live = true;
    Promise.all([getLecturerCourses(), getClassrooms(), getSessions()])
      .then(async ([c, r, s]) => {
        if (!live) return;
        setCourses(c.courses || []);
        setClassrooms(r.classrooms || []);
        const active = (s.sessions || []).find(x => x.is_active) || null;
        setActiveSession(active);
        if (active) {
          const att = await getAttendees(active.id);
          if (live) applyAttendees(att.attendees || []);
        }
      })
      .catch(err => { if (live) toast.error(err.message); })
      .finally(() => { if (live) setLoading(false); });
    return () => { live = false; };
  }, [applyAttendees]);

  useEffect(() => {
    if (!activeSession) return;
    const id = setInterval(async () => {
      try {
        const att = await getAttendees(activeSession.id);
        applyAttendees(att.attendees || []);
      } catch {
        // A dropped poll is not fatal; the next tick retries.
      }
    }, POLL_MS);
    return () => clearInterval(id);
  }, [activeSession, applyAttendees]);

  const handleStart = async () => {
    if (!selectedCourse || !selectedClassroom) {
      toast.error('Pick a course and a room first.');
      return;
    }
    setStarting(true);
    try {
      await createSession(parseInt(selectedCourse), parseInt(selectedClassroom));
      await refresh();
      toast.success('Session open. The code is rotating.');
    } catch (err) {
      toast.error(err.message);
    } finally {
      setStarting(false);
    }
  };

  const handleStop = async () => {
    if (!activeSession) return;
    try {
      await stopSession(activeSession.id);
      seen.current = new Set();
      setActiveSession(null);
      setAttendees([]);
      await refresh();
      toast.success('Session closed.');
    } catch (err) {
      toast.error(err.message);
    }
  };

  const openStats = async (course) => {
    if (statsFor?.id === course.id) { setStatsFor(null); setCourseStats([]); return; }
    setStatsFor(course);
    setCourseStats([]);
    try {
      const data = await getCourseStats(course.id);
      setCourseStats(data.students || []);
    } catch (err) {
      toast.error(err.message);
    }
  };

  if (loading) {
    return (
      <div className="mx-auto max-w-[1400px] space-y-8 px-4 py-10 sm:px-6">
        <Skeleton className="h-9 w-64" />
        <Skeleton className="h-44 w-full" />
        <Skeleton className="h-56 w-full" />
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-[1400px] space-y-10 px-4 py-10 sm:px-6 sm:py-12">
      <Masthead
        title="Sessions"
        detail={user?.full_name}
        aside={
          <StatusFlag tone={activeSession ? 'now' : 'idle'} size="md" live={!!activeSession} flap>
            {activeSession ? 'Boarding' : 'Gate closed'}
          </StatusFlag>
        }
      />

      {/* Gate desk */}
      <section className="border border-slat-edge bg-slat">
        {!activeSession ? (
          <div className="p-5 sm:p-7">
            <h2 className="font-board text-[11px] font-semibold uppercase tracking-gate text-char-dim">
              Open a session
            </h2>
            <p className="mt-2.5 max-w-[64ch] text-sm leading-relaxed text-char-dim">
              Starting a session begins the code rotation for the room you pick.
              Only students inside that room&apos;s boundary can check in.
            </p>

            <div className="mt-6 grid gap-4 lg:grid-cols-[1fr_1fr_auto] lg:items-end">
              <div className="space-y-2.5">
                <Label htmlFor="select-course">Course</Label>
                <Select value={selectedCourse} onValueChange={setSelectedCourse}>
                  <SelectTrigger id="select-course"><SelectValue placeholder="Choose a course" /></SelectTrigger>
                  <SelectContent>
                    {courses.map(c => (
                      <SelectItem key={c.id} value={String(c.id)}>{c.code} — {c.name}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-2.5">
                <Label htmlFor="select-classroom">Room</Label>
                <Select value={selectedClassroom} onValueChange={setSelectedClassroom}>
                  <SelectTrigger id="select-classroom"><SelectValue placeholder="Choose a room" /></SelectTrigger>
                  <SelectContent>
                    {classrooms.map(c => (
                      <SelectItem key={c.id} value={String(c.id)}>{c.name} — {c.building}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <Button
                variant="confirm" size="lg" onClick={handleStart}
                disabled={starting || !selectedCourse || !selectedClassroom}
                id="start-session-btn" className="lg:w-auto"
              >
                <Play className="size-3.5" strokeWidth={2.5} />
                {starting ? 'Opening' : 'Start session'}
              </Button>
            </div>
          </div>
        ) : (
          <>
            <div className="grid gap-5 border-b border-slat-edge p-5 sm:grid-cols-2 sm:p-7 lg:grid-cols-[1.4fr_1fr_auto] lg:items-end">
              <Field label="Course" value={`${activeSession.course_code} — ${activeSession.course_name}`} tone="text-amber" />
              <Field label="Room" value={`${activeSession.classroom_name}${activeSession.building ? ` · ${activeSession.building}` : ''}`} />
              <div className="flex flex-wrap gap-2 sm:col-span-2 lg:col-span-1 lg:justify-end">
                <Button variant="outline" size="lg" asChild>
                  <Link to={`/projector?sessionId=${activeSession.id}`}>
                    <MonitorPlay className="size-3.5" strokeWidth={2.5} />
                    Projector
                  </Link>
                </Button>
                <Button variant="destructive" size="lg" onClick={handleStop} id="stop-session-btn">
                  <Square className="size-3.5" strokeWidth={2.5} />
                  Stop session
                </Button>
              </div>
            </div>

            <div className="p-5 sm:p-7">
              <div className="mb-4 flex flex-wrap items-baseline justify-between gap-3">
                <h2 className="font-board text-[11px] font-semibold uppercase tracking-gate text-char-dim">
                  Checked in
                </h2>
                <div className="flex items-baseline gap-2">
                  <Flap value={String(attendees.length).padStart(2, '0')} className="text-2xl font-bold text-amber" />
                  <span className="font-board text-[10px] uppercase tracking-board text-char-dim">
                    {attendees.length === 1 ? 'student' : 'students'}
                  </span>
                </div>
              </div>

              <Board
                arriving={a => fresh.has(a.reg_number)}
                columns={[
                  {
                    key: 'reg', label: 'Reg. no.', width: 'minmax(0,1.1fr)',
                    render: a => <span className="truncate font-board text-[12px] font-bold uppercase text-char">{a.reg_number}</span>,
                  },
                  {
                    key: 'name', label: 'Name', width: 'minmax(0,1.6fr)',
                    render: a => <span className="truncate text-[13px] text-char-dim">{a.full_name}</span>,
                  },
                  {
                    key: 'time', label: 'Time', width: '96px', align: 'right',
                    render: a => (
                      <span className="font-board text-[12px] text-char-dim">
                        {new Date(a.check_in_time).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', hour12: false })}
                      </span>
                    ),
                  },
                  {
                    key: 'gps', label: 'GPS', width: '52px', align: 'center', hideBelow: 'sm',
                    render: a => <SignalCell label="GPS" on={a.geo_verified} />,
                  },
                  {
                    key: 'dev', label: 'Device', width: '62px', align: 'center', hideBelow: 'sm',
                    render: a => <SignalCell label="Device" on={a.device_verified} />,
                  },
                ]}
                rows={attendees}
                rowKey={a => a.reg_number}
                empty={
                  <BoardEmpty note="The board is live and the code is rotating. Rows appear here as students scan.">
                    Nobody has scanned yet
                  </BoardEmpty>
                }
              />
            </div>
          </>
        )}
      </section>

      {/* Courses and exports */}
      <section className="space-y-4">
        <h2 className="font-board text-[11px] font-semibold uppercase tracking-gate text-char-dim">
          Your courses
        </h2>

        <Board
          columns={[
            {
              key: 'course', label: 'Course', width: 'minmax(0,2fr)',
              render: c => (
                <div className="min-w-0">
                  <div className="font-board text-[12px] font-bold uppercase tracking-tight text-char">{c.code}</div>
                  <div className="truncate text-[13px] text-char-dim">{c.name}</div>
                </div>
              ),
            },
            {
              key: 'dept', label: 'Department', width: 'minmax(0,1.2fr)', hideBelow: 'lg',
              render: c => <span className="truncate text-[13px] text-char-faint">{c.department || '—'}</span>,
            },
            {
              key: 'actions', label: 'Report', width: 'auto', align: 'right',
              render: c => (
                <div className="flex flex-wrap justify-end gap-2">
                  <Button
                    variant={statsFor?.id === c.id ? 'default' : 'outline'} size="sm"
                    onClick={() => openStats(c)} id={`view-stats-${c.id}`}
                  >
                    <BarChart3 className="size-3" strokeWidth={2.5} />
                    Stats
                  </Button>
                  <Button variant="ghost" size="sm" onClick={() => downloadCSV(c.id)} id={`export-csv-${c.id}`}>
                    <Download className="size-3" strokeWidth={2.5} />
                    CSV
                  </Button>
                  <Button variant="ghost" size="sm" onClick={() => downloadExcel(c.id)} id={`export-excel-${c.id}`}>
                    <Download className="size-3" strokeWidth={2.5} />
                    Excel
                  </Button>
                </div>
              ),
            },
          ]}
          rows={courses}
          rowKey={c => c.id}
          empty={<BoardEmpty note="No courses are assigned to your employee ID.">No courses</BoardEmpty>}
        />
      </section>

      {/* Per-student standing */}
      {statsFor && (
        <section className="space-y-4">
          <div className="flex flex-wrap items-baseline justify-between gap-3">
            <h2 className="font-board text-[11px] font-semibold uppercase tracking-gate text-char-dim">
              {statsFor.code} · student standing
            </h2>
            <button
              type="button"
              onClick={() => { setStatsFor(null); setCourseStats([]); }}
              className="font-board text-[10px] uppercase tracking-board text-char-faint underline underline-offset-4 hover:text-char"
            >
              Close
            </button>
          </div>

          <Board
            arriving
            columns={[
              {
                key: 'reg', label: 'Reg. no.', width: 'minmax(0,1.1fr)',
                render: s => <span className="truncate font-board text-[12px] font-bold uppercase text-char">{s.reg_number}</span>,
              },
              {
                key: 'name', label: 'Name', width: 'minmax(0,1.6fr)',
                render: s => <span className="truncate text-[13px] text-char-dim">{s.full_name}</span>,
              },
              {
                key: 'bar', label: 'Against cutoff', width: 'minmax(0,1.6fr)', hideBelow: 'md',
                render: s => <div className="w-full pr-4"><ThresholdBar value={s.attendance_pct} threshold={THRESHOLD} /></div>,
              },
              {
                key: 'count', label: 'Classes', width: '92px', align: 'right', hideBelow: 'sm',
                render: s => <span className="font-board text-[12px] text-char-dim">{s.classes_attended}/{s.total_classes}</span>,
              },
              {
                key: 'pct', label: 'Rate', width: '76px', align: 'right',
                render: s => (
                  <span className={`font-board text-[13px] font-bold ${s.attendance_pct >= THRESHOLD ? 'text-green' : 'text-red'}`}>
                    {s.attendance_pct}%
                  </span>
                ),
              },
              {
                key: 'standing', label: 'Standing', width: '116px', align: 'right',
                render: s => (
                  <StatusFlag tone={s.attendance_pct >= THRESHOLD ? 'clear' : 'deny'}>
                    {s.attendance_pct >= THRESHOLD ? 'Confirmed' : 'Standby'}
                  </StatusFlag>
                ),
              },
            ]}
            rows={courseStats}
            rowKey={s => s.student_id}
            empty={<BoardEmpty note="Nobody is enrolled in this course yet.">No students</BoardEmpty>}
          />
        </section>
      )}
    </div>
  );
}
