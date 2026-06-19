import { useState, useEffect } from 'react';
import { getStudentStats as fetchStats, getStudentHistory } from '../services/api';
import { useAuth } from '../context/AuthContext';
import ProgressRing from '../components/ProgressRing';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Skeleton } from "@/components/ui/skeleton";
import { BarChart3, Calendar, CheckCircle2, AlertTriangle } from 'lucide-react';

export default function StudentDashboard() {
  const { user } = useAuth();
  const [stats, setStats] = useState(null);
  const [selectedCourse, setSelectedCourse] = useState(null);
  const [history, setHistory] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchStats()
      .then(data => {
        setStats(data);
        setLoading(false);
      })
      .catch(err => {
        console.error(err);
        setLoading(false);
      });
  }, []);

  const loadHistory = async (courseId) => {
    setSelectedCourse(courseId);
    try {
      const data = await getStudentHistory(courseId);
      setHistory(data.history);
    } catch (err) {
      console.error(err);
    }
  };

  if (loading) {
    return (
      <div className="container mx-auto py-8 space-y-8">
        <Skeleton className="h-[200px] w-full rounded-xl" />
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
          {[1, 2, 3, 4].map(i => (
            <Skeleton key={i} className="h-[120px] rounded-xl" />
          ))}
        </div>
      </div>
    );
  }

  if (!stats) {
    return (
      <div className="container mx-auto py-32 text-center">
        <div className="mx-auto bg-muted w-20 h-20 rounded-full flex items-center justify-center mb-4">
          <BarChart3 className="w-10 h-10 text-muted-foreground" />
        </div>
        <h2 className="text-2xl font-bold">No Data Available</h2>
        <p className="text-muted-foreground mt-2">Check back after your first session.</p>
      </div>
    );
  }

  const { overall, courses } = stats;

  return (
    <div className="container mx-auto py-8 space-y-8">
      <div>
        <h1 className="text-3xl font-bold tracking-tight">Attendance Dashboard</h1>
        <p className="text-muted-foreground">Welcome back, {user?.full_name}</p>
      </div>

      {/* Overall Progress */}
      <Card>
        <CardContent className="p-6">
          <div className="flex flex-col md:flex-row items-center gap-8">
            <div className="flex-shrink-0">
              <ProgressRing percentage={overall.attendance_pct} label="Overall" />
            </div>

            <div className="flex-1 grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 w-full">
              <Card className="bg-muted/40 border-none shadow-none">
                <CardContent className="p-4 flex flex-col justify-center h-full">
                  <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-1">Classes Attended</p>
                  <p className="text-3xl font-bold font-mono">{overall.classes_attended}</p>
                  <p className="text-xs text-muted-foreground mt-1">of {overall.total_classes} total</p>
                </CardContent>
              </Card>

              <Card className="bg-muted/40 border-none shadow-none">
                <CardContent className="p-4 flex flex-col justify-center h-full">
                  <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-1">Attendance Rate</p>
                  <p className={`text-3xl font-bold font-mono ${overall.attendance_pct >= 80 ? 'text-emerald-500' : overall.attendance_pct >= 60 ? 'text-amber-500' : 'text-destructive'}`}>
                    {overall.attendance_pct}%
                  </p>
                  <p className="text-xs text-muted-foreground mt-1">{overall.attendance_pct >= 80 ? 'Above threshold' : 'Below 80% threshold'}</p>
                </CardContent>
              </Card>

              <Card className="bg-muted/40 border-none shadow-none">
                <CardContent className="p-4 flex flex-col justify-center h-full">
                  <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-1">{overall.status === 'safe' ? 'Can Miss' : 'Must Attend'}</p>
                  <p className={`text-3xl font-bold font-mono ${overall.status === 'safe' ? 'text-emerald-500' : 'text-destructive'}`}>
                    {overall.status === 'safe' ? overall.can_miss : overall.must_attend}
                  </p>
                  <p className="text-xs text-muted-foreground mt-1">
                    {overall.status === 'safe'
                      ? `class${overall.can_miss !== 1 ? 'es' : ''} and stay ≥80%`
                      : `more class${overall.must_attend !== 1 ? 'es' : ''} to reach 80%`
                    }
                  </p>
                </CardContent>
              </Card>

              <Card className="bg-muted/40 border-none shadow-none">
                <CardContent className="p-4 flex flex-col justify-center h-full">
                  <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-2">Status</p>
                  <div>
                    {overall.status === 'safe' ? (
                      <Badge variant="default" className="bg-emerald-500/15 text-emerald-600 hover:bg-emerald-500/25 border-none dark:text-emerald-400">
                        <CheckCircle2 className="w-3 h-3 mr-1" /> Eligible
                      </Badge>
                    ) : (
                      <Badge variant="destructive" className="bg-destructive/15 text-destructive hover:bg-destructive/25 border-none dark:text-destructive-foreground">
                        <AlertTriangle className="w-3 h-3 mr-1" /> At Risk
                      </Badge>
                    )}
                  </div>
                  <p className="text-xs text-muted-foreground mt-2">
                    {overall.status === 'safe' ? '80% requirement met' : 'Attend more classes'}
                  </p>
                </CardContent>
              </Card>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Course Breakdown */}
      <div className="space-y-4">
        <h2 className="text-xl font-bold">Course Breakdown</h2>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {courses.map((course) => {
            const pctColorClass = course.attendance_pct >= 80 ? 'bg-emerald-500' : course.attendance_pct >= 60 ? 'bg-amber-500' : 'bg-destructive';
            const badgeVariant = course.attendance_pct >= 80 ? 'default' : course.attendance_pct >= 60 ? 'secondary' : 'destructive';
            
            return (
              <Card 
                key={course.course_id} 
                className="cursor-pointer hover:border-primary/50 transition-colors duration-200"
                onClick={() => loadHistory(course.course_id)}
                id={`course-card-${course.course_id}`}
              >
                <CardHeader className="pb-3 flex flex-row items-start justify-between space-y-0">
                  <div>
                    <CardTitle className="text-sm font-mono text-primary font-bold">{course.course_code}</CardTitle>
                    <CardDescription className="text-base font-semibold text-foreground mt-1">{course.course_name}</CardDescription>
                  </div>
                  <Badge variant={badgeVariant}>{course.attendance_pct}%</Badge>
                </CardHeader>
                <CardContent>
                  <div className="space-y-2">
                    <Progress value={Math.min(course.attendance_pct, 100)} className="h-2" indicatorClassName={pctColorClass} />
                    <div className="flex items-center justify-between text-xs text-muted-foreground pt-1">
                      <span>{course.classes_attended}/{course.total_classes} classes</span>
                      <span className={course.status === 'safe' ? 'text-emerald-600 dark:text-emerald-400' : 'text-destructive'}>
                        {course.status === 'safe'
                          ? `Can miss ${course.can_miss} more`
                          : `Need ${course.must_attend} more`
                        }
                      </span>
                    </div>
                  </div>
                </CardContent>
              </Card>
            );
          })}
        </div>
      </div>

      {/* Session History */}
      {selectedCourse && history.length > 0 && (
        <div className="space-y-4 animate-in fade-in slide-in-from-bottom-4 duration-500">
          <h2 className="text-xl font-bold">Session History</h2>
          <Card>
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Date</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead>Check-in Time</TableHead>
                  <TableHead>GPS Verified</TableHead>
                  <TableHead>Device Verified</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {history.map((session) => (
                  <TableRow key={session.session_id}>
                    <TableCell className="font-mono text-sm">
                      {new Date(session.session_date).toLocaleDateString('en-US', {
                        weekday: 'short',
                        year: 'numeric',
                        month: 'short',
                        day: 'numeric',
                      })}
                    </TableCell>
                    <TableCell>
                      {session.attended ? (
                        <Badge variant="default" className="bg-emerald-500/15 text-emerald-600 hover:bg-emerald-500/25 border-none">
                          <CheckCircle2 className="w-3 h-3 mr-1" /> Present
                        </Badge>
                      ) : (
                        <Badge variant="destructive" className="bg-destructive/15 text-destructive hover:bg-destructive/25 border-none">
                          <AlertTriangle className="w-3 h-3 mr-1" /> Absent
                        </Badge>
                      )}
                    </TableCell>
                    <TableCell className="font-mono text-sm text-muted-foreground">
                      {session.check_in_time
                        ? new Date(session.check_in_time).toLocaleTimeString()
                        : '—'}
                    </TableCell>
                    <TableCell>
                      {session.attended ? (
                        session.geo_verified ? '✅' : '❌'
                      ) : '—'}
                    </TableCell>
                    <TableCell>
                      {session.attended ? (
                        session.device_verified ? '✅' : '❌'
                      ) : '—'}
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </Card>
        </div>
      )}
    </div>
  );
}
