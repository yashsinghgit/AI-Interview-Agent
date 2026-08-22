// // import { useState } from "react";
// // import { Link, useNavigate } from "react-router-dom";

// // function RegisterPage() {
// //   const navigate = useNavigate();

// //   const [name, setName] = useState("");
// //   const [email, setEmail] = useState("");
// //   const [password, setPassword] = useState("");
// //   const [confirmPassword, setConfirmPassword] = useState("");

// //   const [loading, setLoading] = useState(false);
// //   const [showPassword, setShowPassword] = useState(false);
// //   const [showConfirmPassword, setShowConfirmPassword] = useState(false);

// //   async function handleRegister() {
// //     if (!name || !email || !password || !confirmPassword) {
// //       alert("Please fill in all fields.");
// //       return;
// //     }

// //     if (password !== confirmPassword) {
// //       alert("Passwords do not match.");
// //       return;
// //     }

// //     try {
// //       setLoading(true);

// //       const response = await fetch("http://localhost:5000/register", {
// //         method: "POST",
// //         headers: {
// //           "Content-Type": "application/json",
// //         },
// //         body: JSON.stringify({
// //           name,
// //           email,
// //           password,
// //         }),
// //       });

// //       const data = await response.json();

// //       if (response.ok) {
// //         alert("Registration Successful!");
// //         navigate("/login");
// //       } else {
// //         alert(data.message);
// //       }
// //     } catch (error) {
// //       console.error(error);
// //       alert("Something went wrong!");
// //     } finally {
// //       setLoading(false);
// //     }
// //   }

// //   return (
// //     <div className="min-h-screen flex items-center justify-center bg-gray-100">
// //       <div className="bg-white p-8 rounded-lg shadow-md w-full max-w-md">

// //         <h2 className="text-3xl font-bold text-center mb-6">
// //           Create Account
// //         </h2>

// //         <input
// //           type="text"
// //           placeholder="Full Name"
// //           value={name}
// //           onChange={(e) => setName(e.target.value)}
// //           className="w-full border p-3 rounded mb-4"
// //         />

// //         <input
// //           type="email"
// //           placeholder="Email"
// //           value={email}
// //           onChange={(e) => setEmail(e.target.value)}
// //           className="w-full border p-3 rounded mb-4"
// //         />

// //         <input
// //           type={showPassword ? "text" : "password"}
// //           placeholder="Password"
// //           value={password}
// //           onChange={(e) => setPassword(e.target.value)}
// //           className="w-full border p-3 rounded mb-2"
// //         />

// //         <button
// //           type="button"
// //           onClick={() => setShowPassword(!showPassword)}
// //           className="text-sm text-blue-600 mb-4"
// //         >
// //           {showPassword ? "Hide Password" : "Show Password"}
// //         </button>

// //         <input
// //           type={showConfirmPassword ? "text" : "password"}
// //           placeholder="Confirm Password"
// //           value={confirmPassword}
// //           onChange={(e) => setConfirmPassword(e.target.value)}
// //           className="w-full border p-3 rounded mb-2"
// //         />

// //         <button
// //           type="button"
// //           onClick={() =>
// //             setShowConfirmPassword(!showConfirmPassword)
// //           }
// //           className="text-sm text-blue-600 mb-6"
// //         >
// //           {showConfirmPassword
// //             ? "Hide Password"
// //             : "Show Password"}
// //         </button>

// //         <button
// //           onClick={handleRegister}
// //           disabled={loading}
// //           className="w-full bg-blue-600 text-white p-3 rounded hover:bg-blue-700 disabled:bg-gray-400"
// //         >
// //           {loading ? "Creating Account..." : "Register"}
// //         </button>

// //         <p className="text-center mt-6">
// //           Already have an account?{" "}
// //           <Link
// //             to="/login"
// //             className="text-blue-600 hover:underline"
// //           >
// //             Login
// //           </Link>
// //         </p>
// //       </div>
// //     </div>
// //   );
// // }

// // export default RegisterPage;

// import { useState } from "react";
// import { Link, useNavigate } from "react-router-dom";
// import { Eye, EyeOff, User, Mail, Lock } from "lucide-react";

// function RegisterPage() {
//   const navigate = useNavigate();

//   const [name, setName] = useState("");
//   const [email, setEmail] = useState("");
//   const [password, setPassword] = useState("");
//   const [confirmPassword, setConfirmPassword] = useState("");

//   const [loading, setLoading] = useState(false);
//   const [showPassword, setShowPassword] = useState(false);
//   const [showConfirmPassword, setShowConfirmPassword] = useState(false);

//   async function handleRegister() {
//     if (!name || !email || !password || !confirmPassword) {
//       alert("Please fill in all fields.");
//       return;
//     }

//     if (password !== confirmPassword) {
//       alert("Passwords do not match.");
//       return;
//     }

//     try {
//       setLoading(true);

//       const response = await fetch("http://localhost:5000/register", {
//         method: "POST",
//         headers: {
//           "Content-Type": "application/json",
//         },
//         body: JSON.stringify({
//           name,
//           email,
//           password,
//         }),
//       });

//       const data = await response.json();

//       if (response.ok) {
//         alert("Registration Successful!");
//         navigate("/login");
//       } else {
//         alert(data.message);
//       }
//     } catch (error) {
//       console.error(error);
//       alert("Something went wrong!");
//     } finally {
//       setLoading(false);
//     }
//   }

//   return (
//     <div className="min-h-screen bg-gradient-to-br from-slate-900 via-blue-900 to-indigo-900 flex items-center justify-center px-4">

//       <div className="w-full max-w-md rounded-3xl bg-white/10 backdrop-blur-xl border border-white/20 shadow-2xl p-8">

//         {/* Header */}

//         <div className="text-center mb-8">

//           <div className="w-20 h-20 rounded-full bg-gradient-to-r from-cyan-400 to-blue-600 flex items-center justify-center mx-auto text-4xl shadow-xl">
//             🤖
//           </div>

//           <h1 className="text-3xl font-bold text-white mt-5">
//             Create Account
//           </h1>

//           <p className="text-gray-300 mt-2">
//             Join AI Interview Coach and start preparing smarter.
//           </p>

//         </div>

//         {/* Name */}

//         <div className="relative mb-4">

//           <User
//             size={18}
//             className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-300"
//           />

//           <input
//             type="text"
//             placeholder="Full Name"
//             value={name}
//             onChange={(e) => setName(e.target.value)}
//             className="w-full pl-12 pr-4 py-3 rounded-xl bg-white/15 border border-white/20 text-white placeholder-gray-300 outline-none focus:ring-2 focus:ring-cyan-400 transition"
//           />

//         </div>

//         {/* Email */}

//         <div className="relative mb-4">

//           <Mail
//             size={18}
//             className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-300"
//           />

//           <input
//             type="email"
//             placeholder="Email Address"
//             value={email}
//             onChange={(e) => setEmail(e.target.value)}
//             className="w-full pl-12 pr-4 py-3 rounded-xl bg-white/15 border border-white/20 text-white placeholder-gray-300 outline-none focus:ring-2 focus:ring-cyan-400 transition"
//           />

//         </div>

//         {/* Password */}

//         <div className="relative mb-4">

//           <Lock
//             size={18}
//             className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-300"
//           />

//           <input
//             type={showPassword ? "text" : "password"}
//             placeholder="Password"
//             value={password}
//             onChange={(e) => setPassword(e.target.value)}
//             className="w-full pl-12 pr-12 py-3 rounded-xl bg-white/15 border border-white/20 text-white placeholder-gray-300 outline-none focus:ring-2 focus:ring-cyan-400 transition"
//           />

//           <button
//             type="button"
//             onClick={() => setShowPassword(!showPassword)}
//             className="absolute right-4 top-1/2 -translate-y-1/2 text-gray-300 hover:text-white"
//           >
//             {showPassword ? <EyeOff size={20} /> : <Eye size={20} />}
//           </button>

//         </div>

//         {/* Confirm Password */}

//         <div className="relative mb-6">

//           <Lock
//             size={18}
//             className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-300"
//           />

//           <input
//             type={showConfirmPassword ? "text" : "password"}
//             placeholder="Confirm Password"
//             value={confirmPassword}
//             onChange={(e) => setConfirmPassword(e.target.value)}
//             className="w-full pl-12 pr-12 py-3 rounded-xl bg-white/15 border border-white/20 text-white placeholder-gray-300 outline-none focus:ring-2 focus:ring-cyan-400 transition"
//           />

//           <button
//             type="button"
//             onClick={() =>
//               setShowConfirmPassword(!showConfirmPassword)
//             }
//             className="absolute right-4 top-1/2 -translate-y-1/2 text-gray-300 hover:text-white"
//           >
//             {showConfirmPassword ? (
//               <EyeOff size={20} />
//             ) : (
//               <Eye size={20} />
//             )}
//           </button>

//         </div>

//         {/* Register Button */}

//         <button
//           onClick={handleRegister}
//           disabled={loading}
//           className="w-full py-3 rounded-xl bg-gradient-to-r from-cyan-500 to-blue-600 text-white font-semibold shadow-lg hover:scale-[1.02] hover:shadow-cyan-500/30 transition-all duration-300 disabled:opacity-60"
//         >
//           {loading ? "Creating Account..." : "Create Account"}
//         </button>

//         {/* Divider */}

//         <div className="flex items-center my-6">

//           <div className="flex-1 h-px bg-white/20"></div>

//           <span className="px-4 text-gray-300 text-sm">
//             OR
//           </span>

//           <div className="flex-1 h-px bg-white/20"></div>

//         </div>

//         {/* Login */}

//         <p className="text-center text-gray-300">

//           Already have an account?

//           <Link
//             to="/login"
//             className="ml-2 text-cyan-400 font-semibold hover:text-cyan-300"
//           >
//             Login
//           </Link>

//         </p>

//       </div>

//     </div>
//   );
// }

// export default RegisterPage;

import { useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { Eye, EyeOff } from "lucide-react";

function RegisterPage() {
  const navigate = useNavigate();

  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");

  const [loading, setLoading] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);

  async function handleRegister() {
    if (!name || !email || !password || !confirmPassword) {
      alert("Please fill in all fields.");
      return;
    }

    if (password !== confirmPassword) {
      alert("Passwords do not match.");
      return;
    }

    try {
      setLoading(true);

      const response = await fetch("http://localhost:5000/register", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          name,
          email,
          password,
        }),
      });

      const data = await response.json();

      if (response.ok) {
        alert("Registration Successful!");
        navigate("/login");
      } else {
        alert(data.message);
      }
    } catch (error) {
      console.error(error);
      alert("Something went wrong!");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-slate-100 px-4">
      <div className="w-full max-w-md bg-white rounded-2xl shadow-xl border border-gray-200 p-8">

        <div className="text-center mb-8">
          <h2 className="text-3xl font-bold text-gray-800">
            Create Account
          </h2>

          <p className="text-gray-500 mt-2">
            Register to start your interview journey.
          </p>
        </div>

        <input
          type="text"
          placeholder="Full Name"
          value={name}
          onChange={(e) => setName(e.target.value)}
          className="w-full border border-gray-300 rounded-xl px-4 py-3 mb-4 outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition"
        />

        <input
          type="email"
          placeholder="Email Address"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          className="w-full border border-gray-300 rounded-xl px-4 py-3 mb-4 outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition"
        />

        <div className="relative mb-4">
          <input
            type={showPassword ? "text" : "password"}
            placeholder="Password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            className="w-full border border-gray-300 rounded-xl px-4 py-3 pr-12 outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition"
          />

          <button
            type="button"
            onClick={() => setShowPassword(!showPassword)}
            className="absolute right-4 top-1/2 -translate-y-1/2 text-gray-500 hover:text-blue-600"
          >
            {showPassword ? <EyeOff size={20} /> : <Eye size={20} />}
          </button>
        </div>

        <div className="relative mb-6">
          <input
            type={showConfirmPassword ? "text" : "password"}
            placeholder="Confirm Password"
            value={confirmPassword}
            onChange={(e) => setConfirmPassword(e.target.value)}
            className="w-full border border-gray-300 rounded-xl px-4 py-3 pr-12 outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition"
          />

          <button
            type="button"
            onClick={() =>
              setShowConfirmPassword(!showConfirmPassword)
            }
            className="absolute right-4 top-1/2 -translate-y-1/2 text-gray-500 hover:text-blue-600"
          >
            {showConfirmPassword ? (
              <EyeOff size={20} />
            ) : (
              <Eye size={20} />
            )}
          </button>
        </div>

        <button
          onClick={handleRegister}
          disabled={loading}
          className="w-full bg-blue-600 text-white py-3 rounded-xl font-semibold hover:bg-blue-700 transition duration-200 disabled:bg-gray-400"
        >
          {loading ? "Creating Account..." : "Create Account"}
        </button>

        <p className="text-center mt-6 text-gray-600">
          Already have an account?
          <Link
            to="/login"
            className="ml-1 text-blue-600 font-semibold hover:underline"
          >
            Login
          </Link>
        </p>

      </div>
    </div>
  );
}

export default RegisterPage;