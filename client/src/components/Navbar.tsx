import { useNavigate, Link } from "react-router-dom";

function Navbar() {
  const navigate = useNavigate();

  const isAuthenticated = Boolean(localStorage.getItem("token"));

  const handleHowItWorks = () => {
    if (window.location.pathname === "/") {
      document
        .getElementById("how-it-works")
        ?.scrollIntoView({ behavior: "smooth" });
    } else {
      navigate("/#how-it-works");
    }
  };

  const handleFeatures = () => {
    if (window.location.pathname === "/") {
      document
        .getElementById("features")
        ?.scrollIntoView({ behavior: "smooth" });
    } else {
      navigate("/#features");
    }
  };

  const handleLogout = () => {
    localStorage.removeItem("token");
    navigate("/");
  };

  return (
    <nav className="bg-white border-b border-gray-200">
      <div className="max-w-6xl mx-auto px-6 py-4 flex justify-between items-center">
        {/* Logo */}
        <Link
          to={isAuthenticated ? "/dashboard" : "/"}
          className="flex items-center gap-3"
        >
          <div className="w-9 h-9 rounded-lg bg-blue-600 flex items-center justify-center">
            <span className="text-white font-bold">AI</span>
          </div>

          <span className="text-xl font-bold text-gray-900">
            InterviewAI
          </span>
        </Link>

        {/* Navigation */}
        <div className="flex items-center gap-6">
          {isAuthenticated ? (
            <>
              <Link
                to="/dashboard"
                className="hidden sm:block text-sm font-medium text-gray-600 hover:text-blue-600 transition"
              >
                Dashboard
              </Link>

              <Link
                to="/profile"
                className="hidden sm:block text-sm font-medium text-gray-600 hover:text-blue-600 transition"
              >
                Profile
              </Link>

              <button
                type="button"
                onClick={handleLogout}
                className="text-sm font-semibold text-gray-600 hover:text-red-600 transition"
              >
                Logout
              </button>
            </>
          ) : (
            <>
              <button
                type="button"
                onClick={handleFeatures}
                className="hidden sm:block text-sm font-medium text-gray-600 hover:text-blue-600 transition"
              >
                Features
              </button>

              <button
                type="button"
                onClick={handleHowItWorks}
                className="hidden sm:block text-sm font-medium text-gray-600 hover:text-blue-600 transition"
              >
                How It Works
              </button>

              <Link
                to="/login"
                className="text-sm font-semibold text-gray-600 hover:text-blue-600 transition"
              >
                Login
              </Link>

              <Link
                to="/register"
                className="bg-blue-600 text-white px-4 py-2.5 rounded-lg text-sm font-semibold hover:bg-blue-700 transition shadow-sm"
              >
                Register
              </Link>
            </>
          )}
        </div>
      </div>
    </nav>
  );
}

export default Navbar;