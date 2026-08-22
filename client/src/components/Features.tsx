import { Brain, BarChart3, Mic } from "lucide-react";

 function Features() {
  const features = [
    {
      icon: <Brain size={32} />,
      title: "AI Mock Interviews",
      description: "Practice with AI-generated interview questions tailored to your role.",
    },
    {
      icon: <Mic size={32} />,
      title: "Voice Interaction",
      description: "Answer naturally using your microphone for a realistic experience.",
    },
    {
      icon: <BarChart3 size={32} />,
      title: "Instant Feedback",
      description: "Receive detailed feedback on communication, confidence, and technical skills.",
    },
  ];

  return (
    <section className="py-15">
      <h2 className="text-4xl font-bold text-center mb-12">
        Why Choose InterviewAI?
      </h2>

      <div className="grid md:grid-cols-3 gap-8">
        {features.map((feature) => (
          <div
            key={feature.title}
            className="rounded-2xl border p-8 shadow-sm hover:shadow-lg transition"
          >
            <div className="mb-4">{feature.icon}</div>

            <h3 className="text-2xl font-semibold mb-2">
              {feature.title}
            </h3>

            <p className="text-gray-600">
              {feature.description}
            </p>
          </div>
        ))}
      </div>
    </section>
  );
}

export default Features;