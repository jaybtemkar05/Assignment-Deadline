import { BrowserRouter, Routes, Route } from "react-router-dom";
import { ThemeProvider } from "./context/ThemeContext";
import { ToastProvider } from "./context/ToastContext";
import { DataProvider } from "./context/DataContext";
import ErrorBoundary from "./components/ErrorBoundary";
import Layout from "./components/Layout";
import SemesterSetup from "./pages/SemesterSetup";
import Dashboard from "./pages/Dashboard";
import Subjects from "./pages/Subjects";
import Assignments from "./pages/Assignments";
import Planner from "./pages/Planner";
import Pomodoro from "./pages/Pomodoro";
import Attendance from "./pages/Attendance";
import GPA from "./pages/GPA";
import Notes from "./pages/Notes";
import Settings from "./pages/Settings";
import Help from "./pages/Help";

export default function App() {
  return (
    <ErrorBoundary>
      <ThemeProvider>
        <ToastProvider>
          <DataProvider>
            <BrowserRouter>
              <Routes>
                <Route path="/setup" element={<SemesterSetup />} />
                <Route element={<Layout />}>
                  <Route path="/" element={<Dashboard />} />
                  <Route path="/subjects" element={<Subjects />} />
                  <Route path="/assignments" element={<Assignments />} />
                  <Route path="/planner" element={<Planner />} />
                  <Route path="/pomodoro" element={<Pomodoro />} />
                  <Route path="/attendance" element={<Attendance />} />
                  <Route path="/gpa" element={<GPA />} />
                  <Route path="/notes" element={<Notes />} />
                  <Route path="/settings" element={<Settings />} />
                  <Route path="/help" element={<Help />} />
                  <Route path="*" element={<Dashboard />} />
                </Route>
              </Routes>
            </BrowserRouter>
          </DataProvider>
        </ToastProvider>
      </ThemeProvider>
    </ErrorBoundary>
  );
}
