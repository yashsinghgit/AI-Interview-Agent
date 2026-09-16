import { useEffect, useState } from "react";
import { Navigate, Outlet } from "react-router-dom";
import api from "../services/api";

function ProtectedRoutes() {
  const [isChecking, setIsChecking] = useState(true);
  const [isAuthenticated, setIsAuthenticated] = useState(false);

  useEffect(() => {
    console.log("🔥 ProtectedRoutes is running")
    

    async function checkAuthentication() {

      const token = localStorage.getItem("token");
       console.log("🔑 Token found:", token);

      // No token → definitely not logged in
      if (!token) {
        setIsAuthenticated(false);
        setIsChecking(false);
        return;
      }

      try {
        // Ask backend to validate the token
        await api.get("/profile");

        console.log("✅ Token is valid");

        setIsAuthenticated(true);
        console.log("✅ User is authenticated");
      } catch (error) {
        // Token is invalid/expired
        localStorage.removeItem("token");
        setIsAuthenticated(false);
        console.log("❌ Token is invalid or expired");

      } finally {
        setIsChecking(false);
      }
    }

    checkAuthentication();
  }, []);

  // Wait while checking token with backend
  if (isChecking) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <p className="text-gray-500">Checking authentication...</p>
      </div>
    );
  }

  // Authentication failed → login
  if (!isAuthenticated) {
    return <Navigate to="/login" replace />;
  }

  // Authentication successful → protected page
  return <Outlet />;
}

export default ProtectedRoutes;