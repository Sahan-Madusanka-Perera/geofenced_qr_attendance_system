import { useState, useEffect, useCallback } from 'react';
import {
  getLecturerCourses,
  getClassrooms,
  createSession,
  stopSession,
  getSessions,
  getAttendees,
  getCourseStats,
  downloadCSV,
  downloadExcel,
} from '../services/api';
import { useAuth } from '../context/AuthContext';
import { toast } from 'sonner';
import { Button } from "@/components/ui/button"
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table"
import { Badge } from "@/components/ui/badge"
import { Skeleton } from "@/components/ui/skeleton"
import { Play, Square, BarChart3, Download, Users, User, CheckCircle2, AlertTriangle, Loader2 } from 'lucide-react';

export default function LecturerDashboard() {
  const { user } = useAuth();
  const [courses, setCourses] = useState([]);
  const [classrooms, setClassrooms] = useState([]);
  const [sessions, setSessions] = useState([]);
  const [selectedCourse, setSelectedCourse] = useState('');
  const [selectedClassroom, setSelectedClassroom] = useState('');
  const [activeSession, setActiveSession] = useState(null);
  const [attendees, setAttendees] = useState([]);
  const [courseStats, setCourseStats] = useState([]);
  const [statsCourseid, setStatsCourseId] = useState('');
  const [loading, setLoading] = useState(true);

  const refresh = useCallback(async () => {
    try {
      const [coursesData, classroomsData, sessionsData] = await Promise.all([
        getLecturerCourses(),
        getClassrooms(),
        getSessions(),
      ]);
      setCourses(coursesData.courses || []);
      setClassrooms(classroomsData.classrooms || []);
      setSessions(sessionsData.sessions || []);

      const active = (sessionsData.sessions || []).find(s => s.is_active);
      setActiveSession(active || null);

      if (active) {
        const att = await getAttendees(active.id);
        setAttendees(att.attendees || []);
      }
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    refresh();
  }, [refresh]);

  // Poll attendees while session is active
  useEffect(() => {
    if (!activeSession) return;
    const interval = setInterval(async () => {
      try {
        const att = await getAttendees(activeSession.id);
        setAttendees(att.attendees || []);
      } catch {}
    }, 5000);
    return () => clearInterval(interval);
  }, [activeSession]);

  const handleStartSession = async () => {
    if (!selectedCourse || !selectedClassroom) {
      toast.error('Please select a course and classroom');
      return;
    }
    try {
      await createSession(parseInt(selectedCourse), parseInt(selectedClassroom));
      toast.success('Session started! QR codes are now rotating.');
      refresh();
    } catch (err) {
      toast.error(err.message);
    }
  };

  const handleStopSession = async () => {
    if (!activeSession) return;
    try {
      await stopSession(activeSession.id);
      toast.info('Session stopped.');
      setActiveSession(null);
      setAttendees([]);
      refresh();
    } catch (err) {
      toast.error(err.message);
    }
  };

  const handleViewStats = async (courseId) => {
    setStatsCourseId(courseId);
    try {
      const data = await getCourseStats(courseId);
      setCourseStats(data.students || []);
    } catch (err) {
      toast.error(err.message);
    }
  };

  if (loading) {
    return (
      <div className="container mx-auto py-8 space-y-8">
        <Skeleton className="h-10 w-64" />
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {[1, 2, 3].map(i => <Skeleton key={i} className="h-40 rounded-xl" />)}
        </div>
      </div>
    );
  }

  return (
    <div className="container mx-auto py-8 space-y-10">
      <div>
        <h1 className="text-3xl font-bold tracking-tight">Lecturer Dashboard</h1>
        <p className="text-muted-foreground mt-1">Welcome, {user?.full_name}</p>
      </div>

      {/* Session Controls */}
      <Card className="border-primary/20 shadow-md">
        <CardHeader className="bg-muted/30 border-b pb-4">
          <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
            <CardTitle className="text-xl flex items-center gap-2">
              Session Control
            </CardTitle>
            {activeSession && (
              <Badge variant="default" className="bg-emerald-500 hover:bg-emerald-600 border-none animate-pulse">
                <span className="w-1.5 h-1.5 rounded-full bg-white mr-2"></span>
                LIVE SESSION
              </Badge>
            )}
          </div>
        </CardHeader>
        
        <CardContent className="p-6">
          {!activeSession ? (
            <div className="flex flex-col md:flex-row items-end gap-4">
              <div className="w-full md:w-1/3 space-y-2">
                <label className="text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70">Course</label>
                <Select value={selectedCourse} onValueChange={setSelectedCourse}>
                  <SelectTrigger id="select-course">
                    <SelectValue placeholder="Select course..." />
                  </SelectTrigger>
                  <SelectContent>
                    {courses.map(c => (
                      <SelectItem key={c.id} value={c.id.toString()}>{c.code} — {c.name}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div className="w-full md:w-1/3 space-y-2">
                <label className="text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70">Classroom</label>
                <Select value={selectedClassroom} onValueChange={setSelectedClassroom}>
                  <SelectTrigger id="select-classroom">
                    <SelectValue placeholder="Select classroom..." />
                  </SelectTrigger>
                  <SelectContent>
                    {classrooms.map(c => (
                      <SelectItem key={c.id} value={c.id.toString()}>{c.name} — {c.building}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <Button
                className="w-full md:w-auto bg-emerald-600 hover:bg-emerald-700 text-white"
                size="lg"
                onClick={handleStartSession}
                id="start-session-btn"
              >
                <Play className="w-4 h-4 mr-2" />
                Start Session
              </Button>
            </div>
          ) : (
            <div className="space-y-6">
              <div className="flex flex-col md:flex-row md:items-center justify-between gap-6 p-4 rounded-lg border bg-muted/20">
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-6 w-full md:w-auto">
                  <div>
                    <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">Active Course</p>
                    <p className="text-lg font-bold mt-1 text-primary">
                      {activeSession.course_code} — {activeSession.course_name}
                    </p>
                  </div>
                  <div>
                    <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">Room</p>
                    <p className="text-lg font-bold mt-1">
                      {activeSession.classroom_name}
                    </p>
                  </div>
                </div>
                
                <Button
                  variant="destructive"
                  size="lg"
                  className="w-full md:w-auto flex-shrink-0"
                  onClick={handleStopSession}
                  id="stop-session-btn"
                >
                  <Square className="w-4 h-4 mr-2" />
                  Stop Session
                </Button>
              </div>

              {/* Live Attendees */}
              <div className="space-y-4">
                <div className="flex items-center gap-3">
                  <h3 className="text-lg font-bold flex items-center gap-2">
                    <Users className="w-5 h-5 text-primary" /> Live Check-ins
                  </h3>
                  <Badge variant="secondary" className="bg-primary/10 text-primary">{attendees.length} students</Badge>
                </div>

                {attendees.length > 0 ? (
                  <div className="border rounded-md">
                    <Table>
                      <TableHeader className="bg-muted/50">
                        <TableRow>
                          <TableHead>Reg. No.</TableHead>
                          <TableHead>Name</TableHead>
                          <TableHead>Time</TableHead>
                          <TableHead>GPS</TableHead>
                          <TableHead>Device</TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {attendees.map((a) => (
                          <TableRow key={a.reg_number}>
                            <TableCell className="font-mono font-medium">{a.reg_number}</TableCell>
                            <TableCell>{a.full_name}</TableCell>
                            <TableCell className="font-mono text-muted-foreground">
                              {new Date(a.check_in_time).toLocaleTimeString()}
                            </TableCell>
                            <TableCell>{a.geo_verified ? '✅' : '❌'}</TableCell>
                            <TableCell>{a.device_verified ? '✅' : '❌'}</TableCell>
                          </TableRow>
                        ))}
                      </TableBody>
                    </Table>
                  </div>
                ) : (
                  <div className="flex flex-col items-center justify-center p-8 border rounded-md border-dashed text-muted-foreground bg-muted/10">
                    <Loader2 className="w-8 h-8 mb-4 animate-spin text-muted" />
                    <p>Waiting for students to scan... 📱</p>
                  </div>
                )}
              </div>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Course Reports */}
      <div className="space-y-4">
        <h2 className="text-2xl font-bold tracking-tight">Course Reports</h2>
        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
          {courses.map((course) => (
            <Card key={course.id} className="hover:shadow-md transition-all duration-200">
              <CardHeader className="pb-3">
                <CardTitle className="text-sm font-mono text-primary font-bold">{course.code}</CardTitle>
                <CardDescription className="text-lg font-semibold text-foreground mt-1">
                  {course.name}
                </CardDescription>
              </CardHeader>
              <CardContent>
                <div className="flex flex-wrap gap-2 pt-2">
                  <Button
                    variant="outline"
                    size="sm"
                    className="flex-1"
                    onClick={() => handleViewStats(course.id)}
                    id={`view-stats-${course.id}`}
                  >
                    <BarChart3 className="w-4 h-4 mr-2" />
                    Stats
                  </Button>
                  <Button
                    variant="secondary"
                    size="sm"
                    onClick={() => downloadCSV(course.id)}
                    id={`export-csv-${course.id}`}
                  >
                    CSV
                  </Button>
                  <Button
                    variant="secondary"
                    size="sm"
                    onClick={() => downloadExcel(course.id)}
                    id={`export-excel-${course.id}`}
                  >
                    Excel
                  </Button>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      </div>

      {/* Course Stats Table */}
      {courseStats.length > 0 && (
        <div className="space-y-4 animate-in fade-in slide-in-from-bottom-4 duration-500 pb-10">
          <div className="flex items-center justify-between">
            <h2 className="text-2xl font-bold tracking-tight">Student Attendance</h2>
            <Badge variant="outline" className="text-sm">{courseStats.length} Students</Badge>
          </div>
          <Card>
            <Table>
              <TableHeader className="bg-muted/30">
                <TableRow>
                  <TableHead>Reg. Number</TableHead>
                  <TableHead>Name</TableHead>
                  <TableHead>Department</TableHead>
                  <TableHead>Attended</TableHead>
                  <TableHead>Total</TableHead>
                  <TableHead>Percentage</TableHead>
                  <TableHead>Status</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {courseStats.map((s) => {
                  const isSafe = s.attendance_pct >= 80;
                  const pctColor = isSafe ? 'text-emerald-600 dark:text-emerald-400' : s.attendance_pct >= 60 ? 'text-amber-500' : 'text-destructive';
                  return (
                    <TableRow key={s.student_id}>
                      <TableCell className="font-mono font-medium">{s.reg_number}</TableCell>
                      <TableCell>
                        <div className="flex items-center gap-2">
                          <div className="bg-primary/10 p-1.5 rounded-full">
                            <User className="w-3 h-3 text-primary" />
                          </div>
                          {s.full_name}
                        </div>
                      </TableCell>
                      <TableCell className="text-muted-foreground">{s.department || '—'}</TableCell>
                      <TableCell className="font-mono font-medium">{s.classes_attended}</TableCell>
                      <TableCell className="font-mono text-muted-foreground">{s.total_classes}</TableCell>
                      <TableCell>
                        <span className={`font-mono font-bold ${pctColor}`}>
                          {s.attendance_pct}%
                        </span>
                      </TableCell>
                      <TableCell>
                        {isSafe ? (
                          <Badge variant="default" className="bg-emerald-500/15 text-emerald-600 hover:bg-emerald-500/25 border-none dark:text-emerald-400">
                            <CheckCircle2 className="w-3 h-3 mr-1" /> Eligible
                          </Badge>
                        ) : (
                          <Badge variant="destructive" className="bg-destructive/15 text-destructive hover:bg-destructive/25 border-none dark:text-destructive-foreground">
                            <AlertTriangle className="w-3 h-3 mr-1" /> At Risk
                          </Badge>
                        )}
                      </TableCell>
                    </TableRow>
                  );
                })}
              </TableBody>
            </Table>
          </Card>
        </div>
      )}
    </div>
  );
}
