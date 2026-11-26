import { Routes, Route } from "react-router-dom";
import { Toaster } from "sonner";
import LandingPage from "./pages/LandingPage";
import LoginPage from "./pages/LoginPage";
import RegisterPage from "./pages/RegisterPage";
import DashboardPage from "./pages/DashboardPage";
import InterviewPage from "./pages/InterviewPage";
import ResumePage from "./pages/ResumePage";
import FeedbackPage from "./pages/FeedbackPage";
import ProfilePage from "./pages/ProfilePage";
import NotFoundPage from "./pages/NotFoundPage";
import InterviewSetupPage from "./pages/InterviewSetupPage";
import ProtectedRoute from "./components/ProtectedRoutes";
import VerifyEmailPage from "./pages/VerifyEmailPage";
import ForgotPasswordPage from "./pages/ForgotPasswordPage";
import ResetPasswordPage from "./pages/ResetPasswordPage";

function App() {
  return (
    <>
      <Routes>
      {/* Public Routes */}
      <Route path="/" element={<LandingPage />} />

      <Route path="/login" element={<LoginPage />} />

      <Route path="/register" element={<RegisterPage />} />

      <Route path="/verify-email/:token" element={<VerifyEmailPage />} />

      <Route path="/forgot-password" element={<ForgotPasswordPage />} />

      <Route path="/reset-password/:token" element={<ResetPasswordPage />} />

      {/* Protected Routes */}
      <Route element={<ProtectedRoute />}>
        <Route path="/dashboard" element={<DashboardPage />} />

        <Route path="/interview/setup" element={<InterviewSetupPage />} />

        <Route path="/interview/:id" element={<InterviewPage />} />

        <Route path="/feedback/:id" element={<FeedbackPage />} />

        <Route path="/resume" element={<ResumePage />} />

        <Route path="/profile" element={<ProfilePage />} />
      </Route>

      {/* 404 */}
      <Route path="*" element={<NotFoundPage />} />
    </Routes>
    <Toaster
      position="bottom-right"
      toastOptions={{
        duration: 4000,
        className:
          "!bg-[var(--card)] !text-[var(--foreground)] !border !border-[var(--border)] !rounded-md !font-sans !shadow-sm !text-xs !p-3.5",
        style: {
          backgroundColor: "var(--card)",
          color: "var(--foreground)",
          borderColor: "var(--border)",
          fontFamily: "var(--font-sans)",
        },
      }}
    />
  </>
  );
}

export default App;
