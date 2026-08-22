function Footer() {
  return (
    <footer className="border-t mt-20">
      <div className="max-w-7xl mx-auto px-12 py-10 flex flex-col md:flex-row justify-between items-center">
        <div>
          <h2 className="text-2xl font-bold">InterviewAI</h2>
          <p className="text-gray-600 mt-2">
            Practice smarter. Interview better.
          </p>
        </div>

        <div className="flex gap-6 mt-6 md:mt-0 ">
          <a href="/" className="hover:text-indigo-600 transition" >Home</a>
          <a href="/login" className="hover:text-indigo-600 transition">Login</a>
          <a href="/register" className="hover:text-indigo-600 transition">Register</a>
        </div>
        <p className="text-sm text-gray-500 mt-6">
  © 2026 InterviewAI. All rights reserved.
</p>
      </div>
    </footer>
  );
}

export default Footer;