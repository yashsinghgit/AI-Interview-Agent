import { Brain, BarChart3, Mic } from "lucide-react";

function Features() {
  const features = [
    {
      icon: Brain,
      title: "AI Mock Interviews",
      description:
        "Practice with AI-generated interview questions tailored to your role, experience, and difficulty level.",
    },
    {
      icon: Mic,
      title: "Realistic Practice",
      description:
        "Experience a structured interview environment that helps you practice answering questions naturally.",
    },
    {
      icon: BarChart3,
      title: "Instant Feedback",
      description:
        "Receive detailed AI evaluation with strengths, improvement areas, and an overall performance score.",
    },
  ];

  return (
    <section className="bg-gray-100 px-6 py-16 md:py-20">
      <div className="max-w-6xl mx-auto">
        {/* Section Heading */}
        <div className="text-center max-w-2xl mx-auto mb-12">
          <p className="text-sm font-semibold text-blue-600 mb-3">
            Everything you need
          </p>

          <h2 className="text-3xl md:text-4xl font-bold tracking-tight text-gray-900">
            Prepare smarter. Interview better.
          </h2>

          <p className="mt-4 text-gray-500 leading-relaxed">
            Build your interview confidence with AI-powered practice,
            personalized questions, and actionable feedback.
          </p>
        </div>

        {/* Feature Cards */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          {features.map((feature) => {
            const Icon = feature.icon;

            return (
              <div
                key={feature.title}
                className="bg-white border border-gray-200 rounded-xl p-7 shadow-sm hover:shadow-md hover:border-gray-300 transition-all duration-200"
              >
                <div className="w-12 h-12 rounded-xl bg-blue-50 flex items-center justify-center mb-6">
                  <Icon size={24} className="text-blue-600" />
                </div>

                <h3 className="text-xl font-bold text-gray-900 mb-3">
                  {feature.title}
                </h3>

                <p className="text-gray-500 leading-relaxed">
                  {feature.description}
                </p>
              </div>
            );
          })}
        </div>
      </div>
    </section>
  );
}

export default Features;