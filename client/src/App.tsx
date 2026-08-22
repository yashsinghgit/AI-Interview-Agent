import { Routes, Route } from "react-router-dom";
import LandingPage from "./pages/LandingPage";
import LoginPage from "./pages/LoginPage";
import RegisterPage from "./pages/RegisterPage";
import DashboardPage from "./pages/DashboardPage";
import InterviewPage from "./pages/InterviewPage";
import ResumePage from "./pages/ResumePage";
import FeedbackPage from "./pages/FeedbackPage";
import ProfilePage from "./pages/ProfilePage";
import NotFoundPage from "./pages/NotFoundPage";

function App() {
  return (
    <Routes>
      <Route path="/" element={<LandingPage />} />

      <Route path="/login" element={<LoginPage />} />

      <Route path="/register" element={<RegisterPage />} />

      <Route path="/Dashboard" element={<DashboardPage />} />

      <Route path="*" element={<NotFoundPage />} />

      <Route path="/interview" element={<InterviewPage />} />

      <Route path="/feedback" element={<FeedbackPage />} />

      <Route path="/resume" element={<ResumePage />} />

      <Route path="/profile" element={<ProfilePage />} />
    </Routes>
  );
}

export default App;
