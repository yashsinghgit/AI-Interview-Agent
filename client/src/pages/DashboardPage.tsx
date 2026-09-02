import { useNavigate } from "react-router-dom";
import DashboardCard from "../components/DashboardCard";
import Navbar from "../components/Navbar";


function DashboardPage() {
    const navigate = useNavigate();
  return (
    <>
      <Navbar />

      <main className="min-h-screen bg-gray-100">
        <div className="max-w-7xl mx-auto px-8 py-10">
          <h1 className="text-4xl font-bold">Welcome Back 👋</h1>

          <p className="text-gray-500 mt-2">Ready to ace your next interview</p>

          <div className="grid-md:grid-cols-2 lg:grid-cols-4 gap-6 mt-10">
            <DashboardCard
              icon="🎤"
              title="Start Interview"
              description="Begin an AI mock interview."
              onClick={() => navigate("/interview/setup")}
            />

            <DashboardCard
              icon="📄"
              title="Upload Resume"
              description="Upload your resume for personalized interviews."
              onClick={() => navigate("/resume")}
            />

            <DashboardCard
              icon="📊"
              title="Interview History"
              description="Review your previous interview sessions."
              onClick={() => navigate("/feedback")}
            />

            <DashboardCard
              icon="👤"
              title="Profile"
              description="Manage your account information."
              onClick={() => navigate("/profile")}
            />


          </div>
        </div>
      </main>
    </>
  );
}

export default DashboardPage;

