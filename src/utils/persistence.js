import { newId } from "../hooks/useLocalStorage";
import { DEFAULT_GRADE_SCALE } from "./gpaCalculator";
import { todayISO } from "./dateHelpers";

/**
 * Bump this whenever a persisted shape changes in a way that needs a
 * migration step. Each sanitizer below is intentionally forgiving —
 * it repairs what it can and drops what it can't, rather than trusting
 * localStorage (or an imported file) blindly.
 */
export const SCHEMA_VERSION = 1;

const isValidISODate = (s) => typeof s === "string" && !Number.isNaN(new Date(s + "T00:00:00").getTime());

function str(value, fallback = "") {
  return typeof value === "string" ? value : fallback;
}

function num(value, fallback = 0) {
  const n = Number(value);
  return Number.isFinite(n) ? n : fallback;
}

export function sanitizeSemester(value) {
  if (!value || typeof value !== "object") return null;
  const name = str(value.name).trim();
  if (!name || !isValidISODate(value.startDate) || !isValidISODate(value.endDate)) return null;
  return { name, startDate: value.startDate, endDate: value.endDate };
}

export function sanitizeSubjects(value) {
  if (!Array.isArray(value)) return [];
  return value
    .filter((s) => s && typeof s === "object")
    .map((s) => ({
      id: str(s.id) || newId(),
      name: str(s.name, "Untitled subject").trim() || "Untitled subject",
      code: str(s.code).trim(),
      credits: num(s.credits, 0),
      teacher: str(s.teacher),
      color: str(s.color, "#7C6BFF"),
      grade: str(s.grade),
    }));
}

export function sanitizeAssignments(value, validSubjectIds) {
  if (!Array.isArray(value)) return [];
  const statuses = new Set(["pending", "submitted", "graded"]);
  return value
    .filter((a) => a && typeof a === "object")
    .filter((a) => !validSubjectIds || validSubjectIds.has(a.subjectId))
    .map((a) => ({
      id: str(a.id) || newId(),
      subjectId: str(a.subjectId),
      title: str(a.title, "Untitled assignment").trim() || "Untitled assignment",
      dueDate: isValidISODate(a.dueDate) ? a.dueDate : todayISO(),
      status: statuses.has(a.status) ? a.status : "pending",
      grade: str(a.grade),
    }));
}

export function sanitizeAttendance(value, validSubjectIds) {
  if (!Array.isArray(value)) return [];
  return value
    .filter((a) => a && typeof a === "object")
    .filter((a) => !validSubjectIds || validSubjectIds.has(a.subjectId))
    .map((a) => {
      const held = Math.max(0, Math.round(num(a.held, 0)));
      const attended = Math.min(held, Math.max(0, Math.round(num(a.attended, 0))));
      return { subjectId: str(a.subjectId), held, attended };
    });
}

export function sanitizeNotes(value, validSubjectIds) {
  if (!Array.isArray(value)) return [];
  return value
    .filter((n) => n && typeof n === "object")
    .map((n) => ({
      id: str(n.id) || newId(),
      subjectId: validSubjectIds && n.subjectId && !validSubjectIds.has(n.subjectId) ? null : n.subjectId || null,
      title: str(n.title, "Untitled note").trim() || "Untitled note",
      content: str(n.content),
      pinned: Boolean(n.pinned),
      createdAt: isValidISODate(n.createdAt) ? n.createdAt : todayISO(),
    }));
}

export function sanitizeGoals(value) {
  if (!Array.isArray(value)) return [];
  return value
    .filter((g) => g && typeof g === "object")
    .map((g) => ({
      id: str(g.id) || newId(),
      date: isValidISODate(g.date) ? g.date : todayISO(),
      text: str(g.text).trim(),
      done: Boolean(g.done),
    }))
    .filter((g) => g.text.length > 0);
}

export function sanitizePomodoroSessions(value) {
  if (!Array.isArray(value)) return [];
  return value
    .filter((s) => s && typeof s === "object")
    .map((s) => ({
      id: str(s.id) || newId(),
      date: isValidISODate(s.date) ? s.date : todayISO(),
      minutes: Math.max(0, num(s.minutes, 0)),
    }));
}

export function sanitizeGradeScale(value) {
  if (!Array.isArray(value) || value.length === 0) return DEFAULT_GRADE_SCALE;
  const cleaned = value
    .filter((g) => g && typeof g === "object" && str(g.letter))
    .map((g) => ({ letter: str(g.letter), points: Math.min(4, Math.max(0, num(g.points, 0))) }));
  return cleaned.length > 0 ? cleaned : DEFAULT_GRADE_SCALE;
}

const EXPORT_KEYS = [
  "semester",
  "subjects",
  "assignments",
  "attendance",
  "notes",
  "goals",
  "pomodoroSessions",
  "gradeScale",
];

/** Builds a downloadable JSON snapshot of every collection StudyFlow AI persists. */
export function buildExportSnapshot(data) {
  const payload = { schemaVersion: SCHEMA_VERSION, exportedAt: new Date().toISOString() };
  for (const key of EXPORT_KEYS) payload[key] = data[key];
  return payload;
}

/**
 * Validates and repairs an imported snapshot. Returns { ok, data, error }.
 * Unknown/future schema versions are still attempted on a best-effort basis
 * since every field is re-sanitized anyway.
 */
export function parseImportSnapshot(raw) {
  let json;
  try {
    json = typeof raw === "string" ? JSON.parse(raw) : raw;
  } catch {
    return { ok: false, error: "That file isn't valid JSON." };
  }
  if (!json || typeof json !== "object") {
    return { ok: false, error: "That file doesn't look like a StudyFlow AI export." };
  }

  const subjects = sanitizeSubjects(json.subjects);
  const validSubjectIds = new Set(subjects.map((s) => s.id));

  const data = {
    semester: sanitizeSemester(json.semester),
    subjects,
    assignments: sanitizeAssignments(json.assignments, validSubjectIds),
    attendance: sanitizeAttendance(json.attendance, validSubjectIds),
    notes: sanitizeNotes(json.notes, validSubjectIds),
    goals: sanitizeGoals(json.goals),
    pomodoroSessions: sanitizePomodoroSessions(json.pomodoroSessions),
    gradeScale: sanitizeGradeScale(json.gradeScale),
  };

  if (!data.semester && subjects.length === 0) {
    return { ok: false, error: "No recognizable StudyFlow AI data was found in that file." };
  }

  return { ok: true, data };
}
