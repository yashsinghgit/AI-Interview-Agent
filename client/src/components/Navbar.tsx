import { Link } from "react-router-dom";

type NavbarProps = {
  isAuthenticated?: boolean;
};

function Navbar({ isAuthenticated = false }: NavbarProps) {
  return (
    <nav className="bg-white shadow-md">
      <div className="max-w-7xl mx-auto px-8 py-4 flex justify-between items-center">
        {/* Logo */}
        <Link
          to={isAuthenticated ? "/dashboard" : "/"}
          className="text-2xl font-bold text-blue-600"
        >
          InterviewAI
        </Link>

        {/* Navigation */}
        <div className="flex items-center gap-8">
          {isAuthenticated ? (
            <>
              <Link
                to="/dashboard"
                className="hover:text-blue-600 transition"
              >
                Dashboard
              </Link>

              <Link
                to="/profile"
                className="hover:text-blue-600 transition"
              >
                Profile
              </Link>

              <button className="bg-red-500 text-white px-4 py-2 rounded-lg hover:bg-red-600 transition">
                Logout
              </button>
            </>
          ) : (
            <>
              <a href="#features" className="hover:text-blue-600 transition">
                Features
              </a>

              <a href="#how-it-works" className="hover:text-blue-600 transition">
                How It Works
              </a>

              <Link
                to="/login"
                className="hover:text-blue-600 transition"
              >
                Login
              </Link>

              <Link
                to="/register"
                className="bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700 transition"
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