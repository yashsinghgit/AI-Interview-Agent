import { UserPlus, Laptop, ClipboardCheck } from "lucide-react";

const steps = [
  {
    icon: <UserPlus size={36} />,
    title: "Create Account",
    description: "Sign up and choose the role you want to practice for.",
  },
  {
    icon: <Laptop size={36} />,
    title: "Take AI Interview",
    description: "Answer AI-generated interview questions in real time.",
  },
  {
    icon: <ClipboardCheck size={36} />,
    title: "Get Feedback",
    description: "Receive detailed insights to improve your interview skills.",
  },
];

function HowItWorks() {
  return (
    <section className="py-24">
      <h2 className="text-4xl font-bold text-center mb-14">
        How It Works
      </h2>

      <div className="grid md:grid-cols-3 gap-10">
        {steps.map((step) => (
          <div
            key={step.title}
            className="text-center"
          >
            <div className="flex justify-center mb-6 text-indigo-600">
              {step.icon}
            </div>

            <h3 className="text-2xl font-semibold mb-3">
              {step.title}
            </h3>

            <p className="text-gray-600">
              {step.description}
            </p>
          </div>
        ))}
      </div>
    </section>
  );
}

export default HowItWorks;