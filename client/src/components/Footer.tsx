import { Link } from "react-router-dom";

function Footer() {
  return (
    <footer className="bg-white border-t border-gray-200">
      <div className="max-w-6xl mx-auto px-6 py-10">
        <div className="flex flex-col md:flex-row justify-between gap-8">
          {/* Brand */}
          <div>
            <Link
              to="/"
              className="flex items-center gap-3 w-fit"
            >
              <div className="w-9 h-9 rounded-lg bg-blue-600 flex items-center justify-center">
                <span className="text-white font-bold">AI</span>
              </div>

              <span className="text-xl font-bold text-gray-900">
                InterviewAI
              </span>
            </Link>

            <p className="text-sm text-gray-500 mt-3">
              Practice smarter. Interview better.
            </p>
          </div>

          {/* Navigation */}
          <div className="flex flex-wrap items-center gap-x-6 gap-y-3">
            <Link
              to="/"
              className="text-sm font-medium text-gray-500 hover:text-blue-600 transition"
            >
              Home
            </Link>

            <Link
              to="/login"
              className="text-sm font-medium text-gray-500 hover:text-blue-600 transition"
            >
              Login
            </Link>

            <Link
              to="/register"
              className="text-sm font-medium text-gray-500 hover:text-blue-600 transition"
            >
              Register
            </Link>
          </div>
        </div>

        {/* Bottom */}
        <div className="mt-8 pt-6 border-t border-gray-100">
          <p className="text-sm text-gray-400">
            © 2026 InterviewAI. All rights reserved.
          </p>
        </div>
      </div>
    </footer>
  );
}

export default Footer;