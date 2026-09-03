import { useState, useEffect } from 'react';
import { getStudentStats as fetchStats, getStudentHistory } from '../services/api';
import { useAuth } from '../context/AuthContext';
import Masthead from '../components/board/Masthead';
import Board, { BoardEmpty } from '../components/board/Board';
import StatusFlag from '../components/board/StatusFlag';
import ThresholdBar from '../components/board/ThresholdBar';
import SignalCell from '../components/board/SignalCell';
import { Skeleton } from '@/components/ui/skeleton';
import { ChevronRight } from 'lucide-react';

const THRESHOLD = 80;

function plural(n, one, many) {
  return `${n} ${n === 1 ? one : many}`;
}

export default function StudentDashboard() {
  const { user } = useAuth();
  const [stats, setStats] = useState(null);
  const [selected, setSelected] = useState(null);
  const [history, setHistory] = useState([]);
  const [loading, setLoading] = useState(true);
  const [failed, setFailed] = useState(false);

  useEffect(() => {
    fetchStats()
      .then(setStats)
      .catch(() => setFailed(true))
      .finally(() => setLoading(false));
  }, []);

  const openCourse = async (course) => {
    if (selected?.course_id === course.course_id) {
      setSelected(null);
      return;
    }
    setSelected(course);
    setHistory([]);
    try {
      const data = await getStudentHistory(course.course_id);
      setHistory(data.history || []);
    } catch {
      setHistory([]);
    }
  };

  if (loading) {
    return (
      <div className="mx-auto max-w-[1400px] space-y-8 px-4 py-10 sm:px-6">
        <Skeleton className="h-9 w-72" />
        <Skeleton className="h-32 w-full" />
        <Skeleton className="h-64 w-full" />
      </div>
    );
  }

  if (failed || !stats) {
    return (
      <div className="mx-auto max-w-[1400px] px-4 py-10 sm:px-6">
        <Masthead
          title="Attendance record"
          detail={failed
            ? 'The board could not reach the server. Reload the page; if it keeps failing, the API is down.'
            : 'Nothing has been recorded against your registration number yet. Your first check-in starts this record.'}
        />
      </div>
    );
  }

  const { overall, courses } = stats;
  const cleared = overall.attendance_pct >= THRESHOLD;

  return (
    <div className="mx-auto max-w-[1400px] space-y-10 px-4 py-10 sm:px-6 sm:py-12">
      <Masthead
        title="Attendance record"
        detail={`${user?.full_name}${user?.reg_number ? ` · ${user.reg_number}` : ''}`}
        aside={
          <StatusFlag tone={cleared ? 'clear' : 'deny'} size="md" flap>
            {cleared ? 'Confirmed' : 'Standby'}
          </StatusFlag>
        }
      />

      {/* Standing against the cutoff. The bar is the object; the number reads off it. */}
      <section className="border border-slat-edge bg-slat p-5 sm:p-7">
        <div className="flex flex-wrap items-baseline justify-between gap-x-8 gap-y-2">
          <div className="flex items-baseline gap-3">
            <span className={`font-board text-4xl font-bold leading-none tracking-tight sm:text-5xl ${cleared ? 'text-green' : 'text-red'}`}>
              {overall.attendance_pct}%
            </span>
            <span className="font-board text-[11px] uppercase tracking-board text-char-dim">
              {overall.classes_attended} of {overall.total_classes} classes
            </span>
          </div>
        </div>

        <ThresholdBar
          value={overall.attendance_pct}
          threshold={THRESHOLD}
          height="h-4"
          showScale
          className="mt-6"
        />

        <div className="mt-6 border-t border-slat-edge pt-5">
          <p className="max-w-[64ch] text-[15px] leading-relaxed text-char-dim">
            {cleared
              ? (overall.can_miss === 0
                  ? <>You are exactly on the {THRESHOLD}% cutoff. Missing one more class drops you below it.</>
                  : <>You can miss <span className="font-board font-semibold text-char">{plural(overall.can_miss, 'more class', 'more classes')}</span> and still clear the {THRESHOLD}% cutoff.</>)
              : <>You need <span className="font-board font-semibold text-char">{plural(overall.must_attend, 'more class', 'more classes')}</span> to reach the {THRESHOLD}% cutoff.</>}
          </p>
        </div>
      </section>

      {/* Courses */}
      <section className="space-y-4">
        <h2 className="font-board text-[11px] font-semibold uppercase tracking-gate text-char-dim">
          Courses
        </h2>

        <Board
          columns={[
            {
              key: 'course', label: 'Course', width: 'minmax(0,2.4fr)',
              render: c => (
                <div className="min-w-0">
                  <div className="font-board text-[12px] font-bold uppercase tracking-tight text-char">
                    {c.course_code}
                  </div>
                  <div className="truncate text-[13px] text-char-dim">{c.course_name}</div>
                </div>
              ),
            },
            {
              key: 'bar', label: 'Against cutoff', width: 'minmax(0,2fr)', hideBelow: 'md',
              render: c => (
                <div className="w-full pr-4">
                  <ThresholdBar value={c.attendance_pct} threshold={THRESHOLD} />
                </div>
              ),
            },
            {
              key: 'pct', label: 'Rate', width: '84px', align: 'right',
              render: c => (
                <span className={`font-board text-[13px] font-bold ${c.attendance_pct >= THRESHOLD ? 'text-green' : 'text-red'}`}>
                  {c.attendance_pct}%
                </span>
              ),
            },
            {
              key: 'count', label: 'Classes', width: '92px', align: 'right', hideBelow: 'sm',
              render: c => (
                <span className="font-board text-[12px] text-char-dim">
                  {c.classes_attended}/{c.total_classes}
                </span>
              ),
            },
            {
              key: 'margin', label: 'Margin', width: 'minmax(0,1.2fr)', align: 'right', hideBelow: 'lg',
              render: c => (
                <span className="truncate font-board text-[10px] uppercase tracking-board text-char-dim">
                  {c.status !== 'safe'
                    ? `Needs ${c.must_attend}`
                    : c.can_miss === 0
                      ? 'No margin'
                      : `Can miss ${c.can_miss}`}
                </span>
              ),
            },
            {
              key: 'open', label: '', width: '28px', align: 'right',
              render: c => (
                <ChevronRight
                  className={`size-4 text-char-faint transition-transform ${selected?.course_id === c.course_id ? 'rotate-90 text-amber' : ''}`}
                  aria-hidden="true"
                />
              ),
            },
          ]}
          rows={courses}
          rowKey={c => c.course_id}
          onRowClick={openCourse}
          isRowOpen={c => selected?.course_id === c.course_id}
          rowLabel={c => `${c.course_code}, ${c.attendance_pct} percent. Show sessions.`}
          empty={<BoardEmpty note="You are not enrolled in any course yet.">No courses</BoardEmpty>}
        />

        <div className="sr-only" aria-live="polite">
          {selected ? `Showing sessions for ${selected.course_code}` : ''}
        </div>
      </section>

      {/* Session history */}
      {selected && (
        <section className="space-y-4">
          <div className="flex flex-wrap items-baseline justify-between gap-3">
            <h2 className="font-board text-[11px] font-semibold uppercase tracking-gate text-char-dim">
              {selected.course_code} sessions
            </h2>
            <button
              type="button"
              onClick={() => setSelected(null)}
              className="font-board text-[10px] uppercase tracking-board text-char-faint underline underline-offset-4 hover:text-char"
            >
              Close
            </button>
          </div>

          <Board
            arriving
            className="max-w-4xl"
            columns={[
              {
                key: 'date', label: 'Date', width: 'minmax(0,1fr)',
                render: s => (
                  <span className="font-board text-[12px] uppercase text-char">
                    {new Date(s.session_date).toLocaleDateString([], {
                      day: '2-digit', month: 'short', year: 'numeric',
                    })}
                  </span>
                ),
              },
              {
                key: 'status', label: 'Record', width: '120px',
                render: s => (
                  <StatusFlag tone={s.attended ? 'clear' : 'deny'}>
                    {s.attended ? 'Present' : 'Absent'}
                  </StatusFlag>
                ),
              },
              {
                key: 'time', label: 'Checked in', width: '110px', hideBelow: 'sm',
                render: s => s.check_in_time ? (
                  <span className="font-board text-[12px] text-char-dim">
                    {new Date(s.check_in_time).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', hour12: false })}
                  </span>
                ) : <span className="font-board text-[12px] text-char-faint">--:--</span>,
              },
              {
                key: 'gps', label: 'GPS', width: '52px', align: 'center', hideBelow: 'sm',
                render: s => <SignalCell label="GPS" on={s.geo_verified} off={!s.attended} />,
              },
              {
                key: 'device', label: 'Device', width: '62px', align: 'center', hideBelow: 'sm',
                render: s => <SignalCell label="Device" on={s.device_verified} off={!s.attended} />,
              },
            ]}
            rows={history}
            rowKey={s => s.session_id}
            empty={<BoardEmpty note="No sessions have been held for this course yet.">No sessions</BoardEmpty>}
          />
        </section>
      )}
    </div>
  );
}
