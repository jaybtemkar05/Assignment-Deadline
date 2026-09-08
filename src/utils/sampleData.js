import { newId } from "../hooks/useLocalStorage";
import { todayISO, lastNDays, addDays, formatLocalDate } from "./dateHelpers";

/** Builds a fully populated demo dataset so evaluators see a working app instantly. */
export function buildSampleData() {
  const today = todayISO();
  const start = new Date();
  start.setMonth(start.getMonth() - 2);
  const end = new Date();
  end.setMonth(end.getMonth() + 2);

  const subjects = [
    { id: newId(), name: "Data Structures", code: "CS201", credits: 3, color: "#7C6BFF", teacher: "Dr. Farah Khan", grade: "A-" },
    { id: newId(), name: "Calculus II", code: "MATH210", credits: 4, color: "#FF7EB6", teacher: "Prof. Ahsan Raza", grade: "B+" },
    { id: newId(), name: "Digital Logic Design", code: "EE150", credits: 3, color: "#33C7C0", teacher: "Dr. Sana Iqbal", grade: "A" },
    { id: newId(), name: "Technical Writing", code: "ENG110", credits: 2, color: "#FFB86B", teacher: "Ms. Hira Malik", grade: "" },
  ];

  const assignments = [
    { id: newId(), subjectId: subjects[0].id, title: "Linked List Lab Report", dueDate: addDays(today, -2), status: "graded", grade: "A" },
    { id: newId(), subjectId: subjects[0].id, title: "Binary Tree Assignment", dueDate: addDays(today, 2), status: "pending", grade: "" },
    { id: newId(), subjectId: subjects[1].id, title: "Integration Problem Set", dueDate: addDays(today, 1), status: "pending", grade: "" },
    { id: newId(), subjectId: subjects[1].id, title: "Series Convergence Quiz", dueDate: addDays(today, -5), status: "graded", grade: "B" },
    { id: newId(), subjectId: subjects[2].id, title: "Karnaugh Map Exercise", dueDate: addDays(today, 5), status: "pending", grade: "" },
    { id: newId(), subjectId: subjects[3].id, title: "Research Proposal Draft", dueDate: addDays(today, -1), status: "submitted", grade: "" },
  ];

  const attendance = [
    { subjectId: subjects[0].id, held: 20, attended: 18 },
    { subjectId: subjects[1].id, held: 22, attended: 15 },
    { subjectId: subjects[2].id, held: 18, attended: 17 },
    { subjectId: subjects[3].id, held: 14, attended: 10 },
  ];

  const notes = [
    { id: newId(), subjectId: subjects[0].id, title: "Big-O cheat sheet", content: "O(1) constant, O(log n) log, O(n) linear, O(n log n), O(n^2) quadratic. Always check nested loops first.", pinned: true, createdAt: today },
    { id: newId(), subjectId: subjects[2].id, title: "K-map grouping rules", content: "Group in powers of 2 (1, 2, 4, 8). Groups can wrap around edges. Aim for the fewest, largest groups.", pinned: false, createdAt: today },
  ];

  const last14 = lastNDays(14);
  const goals = last14.flatMap((date, i) => [
    { id: newId(), date, text: "Review lecture notes", done: i < 10 },
    { id: newId(), date, text: "Complete one practice problem set", done: i < 8 },
  ]);

  const pomodoroSessions = last14.map((date, i) => ({
    id: newId(),
    date,
    minutes: [50, 25, 0, 75, 100, 25, 50, 0, 125, 75, 25, 50, 100, 25][i] ?? 0,
  }));

  return {
    semester: {
      name: "Fall Semester 2026",
      startDate: formatLocalDate(start),
      endDate: formatLocalDate(end),
    },
    subjects,
    assignments,
    attendance,
    notes,
    goals,
    pomodoroSessions,
  };
}
