import { UserPlus, Laptop, ClipboardCheck, ArrowRight } from "lucide-react";
import { useNavigate } from "react-router-dom";

const steps = [
  {
    number: "01",
    icon: UserPlus,
    title: "Create Your Account",
    description:
      "Sign up and set up your profile with the role and experience you want to practice for.",
    path: "/register",
  },
  {
    number: "02",
    icon: Laptop,
    title: "Take an AI Interview",
    description:
      "Answer personalized interview questions generated specifically for your role and experience.",
    path: "/interview/setup",
  },
  {
    number: "03",
    icon: ClipboardCheck,
    title: "Get Detailed Feedback",
    description:
      "Review your AI evaluation, strengths, areas for improvement, and overall interview performance.",
    path: "/dashboard",
  },
];

function HowItWorks() {
  const navigate = useNavigate();

  return (
    <section
      id="how-it-works"
      className="bg-gray-100 px-6 py-16 md:py-20"
    >
      <div className="max-w-6xl mx-auto">
        {/* Section Heading */}
        <div className="text-center max-w-2xl mx-auto mb-12">
          <p className="text-sm font-semibold text-blue-600 mb-3">
            Simple process
          </p>

          <h2 className="text-3xl md:text-4xl font-bold tracking-tight text-gray-900">
            How It Works
          </h2>

          <p className="mt-4 text-gray-500 leading-relaxed">
            Go from preparation to actionable feedback in just three simple
            steps.
          </p>
        </div>

        {/* Steps */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          {steps.map((step) => {
            const Icon = step.icon;

            return (
              <button
                key={step.title}
                onClick={() => navigate(step.path)}
                className="group relative text-left bg-white border border-gray-200 rounded-xl p-7 shadow-sm hover:shadow-md hover:border-blue-200 transition-all duration-200"
              >
                {/* Step Number + Icon */}
                <div className="flex items-center justify-between mb-6">
                  <div className="w-12 h-12 rounded-xl bg-blue-50 flex items-center justify-center group-hover:bg-blue-100 transition">
                    <Icon
                      size={24}
                      className="text-blue-600"
                    />
                  </div>

                  <span className="text-sm font-bold text-gray-300">
                    {step.number}
                  </span>
                </div>

                {/* Content */}
                <h3 className="text-xl font-bold text-gray-900 mb-3">
                  {step.title}
                </h3>

                <p className="text-gray-500 leading-relaxed">
                  {step.description}
                </p>

                {/* Action */}
                <div className="flex items-center gap-2 mt-6 text-sm font-semibold text-blue-600">
                  Explore
                  <ArrowRight
                    size={16}
                    className="group-hover:translate-x-1 transition-transform"
                  />
                </div>
              </button>
            );
          })}
        </div>
      </div>
    </section>
  );
}

export default HowItWorks;