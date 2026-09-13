import { ArrowRight, Sparkles, CheckCircle2 } from "lucide-react";
import { useNavigate } from "react-router-dom";
import heroImage from "../assets/hero.svg";

function Hero() {
  const navigate = useNavigate();

  return (
    <section className="bg-gray-100 px-6 py-16 md:py-24">
      <div className="max-w-6xl mx-auto">
        <div className="bg-white border border-gray-200 rounded-2xl shadow-sm overflow-hidden">
          <div className="grid grid-cols-1 lg:grid-cols-2 items-center gap-10 px-8 py-12 md:px-12 md:py-16">
            
            {/* Left Content */}
            <div>
              <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full bg-blue-50 border border-blue-100 text-blue-600 text-sm font-semibold mb-6">
                <Sparkles size={16} />
                AI-Powered Interview Practice
              </div>

              <h1 className="text-4xl md:text-5xl lg:text-6xl font-bold leading-tight tracking-tight text-gray-900">
                Ace Your Next
                <span className="block text-blue-600">
                  Interview
                </span>
              </h1>

              <p className="mt-6 max-w-xl text-base md:text-lg leading-relaxed text-gray-500">
                Practice realistic mock interviews with AI, receive instant
                feedback, and build the confidence you need to succeed.
              </p>

              {/* Benefits */}
              <div className="mt-7 space-y-3">
                <div className="flex items-center gap-3 text-sm text-gray-600">
                  <CheckCircle2 size={18} className="text-blue-600" />
                  Personalized interview questions
                </div>

                <div className="flex items-center gap-3 text-sm text-gray-600">
                  <CheckCircle2 size={18} className="text-blue-600" />
                  Instant AI-powered evaluation
                </div>

                <div className="flex items-center gap-3 text-sm text-gray-600">
                  <CheckCircle2 size={18} className="text-blue-600" />
                  Detailed performance reports
                </div>
              </div>

              {/* CTA Buttons */}
              <div className="mt-9 flex flex-col sm:flex-row gap-3">
                <button 
                  onClick={ () => {
                    const token  = localStorage.getItem("token");

                    if(token) {
                      navigate("/interview/setup");
                    }
                    else {
                      navigate("/login");
                    }
                  } }
                  className="inline-flex items-center justify-center gap-2 bg-blue-600 text-white px-6 py-3 rounded-lg font-semibold hover:bg-blue-700 transition shadow-sm"
                >
                  Start Interview
                  <ArrowRight size={18} />
                </button>

                <button
                  onClick={() =>
                    document
                      .getElementById("how-it-works")
                      ?.scrollIntoView({ behavior: "smooth" })
                  }
                  className="inline-flex items-center justify-center px-6 py-3 rounded-lg font-semibold text-gray-700 bg-white border border-gray-300 hover:bg-gray-50 hover:border-gray-400 transition"
                >
                  Learn More
                </button>
              </div>
            </div>

            {/* Right Illustration */}
            <div className="flex justify-center lg:justify-end">
              <div className="w-full max-w-lg">
                <img
                  src={heroImage}
                  alt="AI interview illustration"
                  className="w-full h-auto"
                />
              </div>
            </div>

          </div>
        </div>
      </div>
    </section>
  );
}

export default Hero;