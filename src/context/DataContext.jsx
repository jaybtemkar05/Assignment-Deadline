import { createContext, useContext, useMemo } from "react";
import { useLocalStorage, newId } from "../hooks/useLocalStorage";
import { DEFAULT_GRADE_SCALE, calculateGPA } from "../utils/gpaCalculator";
import { buildSampleData } from "../utils/sampleData";
import { todayISO } from "../utils/dateHelpers";
import {
  sanitizeSemester,
  sanitizeSubjects,
  sanitizeAssignments,
  sanitizeAttendance,
  sanitizeNotes,
  sanitizeGoals,
  sanitizePomodoroSessions,
  sanitizeGradeScale,
  buildExportSnapshot,
  parseImportSnapshot,
} from "../utils/persistence";

const DataContext = createContext(null);

export function DataProvider({ children }) {
  const [semester, setSemester] = useLocalStorage("semester", null, sanitizeSemester);
  const [subjects, setSubjects] = useLocalStorage("subjects", [], sanitizeSubjects);

  // Assignments/attendance/notes are sanitized against the subject ids that
  // were just resolved above, so a corrupted or hand-edited record pointing
  // at a subject that no longer exists is dropped instead of causing a
  // "can't find subject" crash deeper in the UI.
  const validSubjectIds = useMemo(() => new Set(subjects.map((s) => s.id)), [subjects]);
  const sanitizeAssignmentsBound = useMemo(() => (v) => sanitizeAssignments(v, validSubjectIds), [validSubjectIds]);
  const sanitizeAttendanceBound = useMemo(() => (v) => sanitizeAttendance(v, validSubjectIds), [validSubjectIds]);
  const sanitizeNotesBound = useMemo(() => (v) => sanitizeNotes(v, validSubjectIds), [validSubjectIds]);

  const [assignments, setAssignments] = useLocalStorage("assignments", [], sanitizeAssignmentsBound);
  const [attendance, setAttendance] = useLocalStorage("attendance", [], sanitizeAttendanceBound);
  const [notes, setNotes] = useLocalStorage("notes", [], sanitizeNotesBound);
  const [goals, setGoals] = useLocalStorage("goals", [], sanitizeGoals);
  const [pomodoroSessions, setPomodoroSessions] = useLocalStorage("pomodoroSessions", [], sanitizePomodoroSessions);
  const [gradeScale, setGradeScale] = useLocalStorage("gradeScale", DEFAULT_GRADE_SCALE, sanitizeGradeScale);

  // ---- Subjects ----
  const addSubject = (subject) => {
    setSubjects((list) => [...list, { id: newId(), grade: "", ...subject }]);
  };
  const updateSubject = (id, patch) => {
    setSubjects((list) => list.map((s) => (s.id === id ? { ...s, ...patch } : s)));
  };
  const deleteSubject = (id) => {
    setSubjects((list) => list.filter((s) => s.id !== id));
    setAssignments((list) => list.filter((a) => a.subjectId !== id));
    setAttendance((list) => list.filter((a) => a.subjectId !== id));
    setNotes((list) => list.filter((n) => n.subjectId !== id));
  };

  // ---- Assignments ----
  const addAssignment = (assignment) => {
    setAssignments((list) => [...list, { id: newId(), status: "pending", grade: "", ...assignment }]);
  };
  const updateAssignment = (id, patch) => {
    setAssignments((list) => list.map((a) => (a.id === id ? { ...a, ...patch } : a)));
  };
  const deleteAssignment = (id) => {
    setAssignments((list) => list.filter((a) => a.id !== id));
  };

  // ---- Attendance ----
  const getAttendanceFor = (subjectId) =>
    attendance.find((a) => a.subjectId === subjectId) || { subjectId, held: 0, attended: 0 };

  const markAttendance = (subjectId, present) => {
    setAttendance((list) => {
      const existing = list.find((a) => a.subjectId === subjectId);
      if (existing) {
        return list.map((a) =>
          a.subjectId === subjectId
            ? { ...a, held: a.held + 1, attended: a.attended + (present ? 1 : 0) }
            : a
        );
      }
      return [...list, { subjectId, held: 1, attended: present ? 1 : 0 }];
    });
  };

  const adjustAttendance = (subjectId, field, delta) => {
    setAttendance((list) => {
      const existing = list.find((a) => a.subjectId === subjectId);
      const base = existing || { subjectId, held: 0, attended: 0 };
      const next = { ...base, [field]: Math.max(0, base[field] + delta) };
      if (next.attended > next.held) next.attended = next.held;
      if (existing) {
        return list.map((a) => (a.subjectId === subjectId ? next : a));
      }
      return [...list, next];
    });
  };

  // ---- Notes ----
  const addNote = (note) => setNotes((list) => [{ id: newId(), pinned: false, createdAt: todayISO(), ...note }, ...list]);
  const updateNote = (id, patch) => setNotes((list) => list.map((n) => (n.id === id ? { ...n, ...patch } : n)));
  const deleteNote = (id) => setNotes((list) => list.filter((n) => n.id !== id));

  // ---- Goals ----
  const addGoal = (goal) => setGoals((list) => [...list, { id: newId(), date: todayISO(), done: false, ...goal }]);
  const toggleGoal = (id) => setGoals((list) => list.map((g) => (g.id === id ? { ...g, done: !g.done } : g)));
  const deleteGoal = (id) => setGoals((list) => list.filter((g) => g.id !== id));

  // ---- Pomodoro ----
  const logPomodoroMinutes = (minutes) => {
    const date = todayISO();
    setPomodoroSessions((list) => {
      const existing = list.find((s) => s.date === date);
      if (existing) {
        return list.map((s) => (s.date === date ? { ...s, minutes: s.minutes + minutes } : s));
      }
      return [...list, { id: newId(), date, minutes }];
    });
  };

  // ---- Derived values ----
  const gpa = useMemo(() => calculateGPA(subjects, gradeScale), [subjects, gradeScale]);

  const loadSampleData = () => {
    const sample = buildSampleData();
    setSemester(sample.semester);
    setSubjects(sample.subjects);
    setAssignments(sample.assignments);
    setAttendance(sample.attendance);
    setNotes(sample.notes);
    setGoals(sample.goals);
    setPomodoroSessions(sample.pomodoroSessions);
  };

  const clearAllData = () => {
    setSemester(null);
    setSubjects([]);
    setAssignments([]);
    setAttendance([]);
    setNotes([]);
    setGoals([]);
    setPomodoroSessions([]);
    setGradeScale(DEFAULT_GRADE_SCALE);
  };

  const exportData = () =>
    buildExportSnapshot({ semester, subjects, assignments, attendance, notes, goals, pomodoroSessions, gradeScale });

  /** Returns { ok, error } so the calling page can show the right toast. */
  const importData = (raw) => {
    const result = parseImportSnapshot(raw);
    if (!result.ok) return result;
    const { data } = result;
    setSemester(data.semester);
    setSubjects(data.subjects);
    setAssignments(data.assignments);
    setAttendance(data.attendance);
    setNotes(data.notes);
    setGoals(data.goals);
    setPomodoroSessions(data.pomodoroSessions);
    setGradeScale(data.gradeScale);
    return { ok: true };
  };

  const value = {
    semester,
    setSemester,
    subjects,
    addSubject,
    updateSubject,
    deleteSubject,
    assignments,
    addAssignment,
    updateAssignment,
    deleteAssignment,
    attendance,
    getAttendanceFor,
    markAttendance,
    adjustAttendance,
    notes,
    addNote,
    updateNote,
    deleteNote,
    goals,
    addGoal,
    toggleGoal,
    deleteGoal,
    pomodoroSessions,
    logPomodoroMinutes,
    gradeScale,
    setGradeScale,
    gpa,
    loadSampleData,
    clearAllData,
    exportData,
    importData,
  };

  return <DataContext.Provider value={value}>{children}</DataContext.Provider>;
}

// eslint-disable-next-line react-refresh/only-export-components -- hook is intentionally co-located with its provider
export function useData() {
  const ctx = useContext(DataContext);
  if (!ctx) throw new Error("useData must be used within DataProvider");
  return ctx;
}
