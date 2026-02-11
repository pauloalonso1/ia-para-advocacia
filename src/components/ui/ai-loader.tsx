import * as React from "react";
import { useState, useEffect } from "react";

interface AILoaderProps {
  size?: number;
  steps?: string[];
  stepInterval?: number;
}

const defaultSteps = [
  "Analisando dados...",
  "Pensando...",
  "Redigindo petição...",
  "Formatando documento...",
  "Finalizando...",
];

const AILoader: React.FC<AILoaderProps> = ({
  size = 180,
  steps = defaultSteps,
  stepInterval = 4000,
}) => {
  const [currentStep, setCurrentStep] = useState(0);

  useEffect(() => {
    const interval = setInterval(() => {
      setCurrentStep((prev) => (prev + 1) % steps.length);
    }, stepInterval);
    return () => clearInterval(interval);
  }, [steps.length, stepInterval]);

  const text = steps[currentStep];
  const letters = text.split("");

  return (
    <div className="fixed inset-0 z-50 flex flex-col items-center justify-center bg-gradient-to-b from-[hsl(var(--primary))] via-[hsl(var(--background))] to-black/90">
      <div
        className="relative flex items-center justify-center font-sans select-none"
        style={{ width: size, height: size }}
      >
        <div
          className="absolute inset-0 rounded-full"
          style={{ animation: "loaderCircle 5s linear infinite" }}
        />
      </div>

      <div className="mt-6 h-8 flex items-center justify-center">
        <span className="flex" key={currentStep}>
          {letters.map((letter, index) => (
            <span
              key={`${currentStep}-${index}`}
              className="inline-block text-white/90 text-lg font-medium"
              style={{
                animation: "loaderLetter 3s infinite, loaderFadeIn 0.4s ease-out forwards",
                animationDelay: `${index * 0.05}s`,
                opacity: 0,
              }}
            >
              {letter === " " ? "\u00A0" : letter}
            </span>
          ))}
        </span>
      </div>

      {/* Step indicators */}
      <div className="mt-4 flex gap-1.5">
        {steps.map((_, i) => (
          <div
            key={i}
            className="h-1 rounded-full transition-all duration-500"
            style={{
              width: i === currentStep ? 24 : 8,
              backgroundColor: i === currentStep ? "rgba(255,255,255,0.9)" : "rgba(255,255,255,0.2)",
            }}
          />
        ))}
      </div>

      <style>{`
        @keyframes loaderCircle {
          0% {
            transform: rotate(90deg);
            box-shadow:
              0 6px 12px 0 #38bdf8 inset,
              0 12px 18px 0 #005dff inset,
              0 36px 36px 0 #1e40af inset,
              0 0 3px 1.2px rgba(56, 189, 248, 0.3),
              0 0 6px 1.8px rgba(0, 93, 255, 0.2);
          }
          50% {
            transform: rotate(270deg);
            box-shadow:
              0 6px 12px 0 #60a5fa inset,
              0 12px 6px 0 #0284c7 inset,
              0 24px 36px 0 #005dff inset,
              0 0 3px 1.2px rgba(56, 189, 248, 0.3),
              0 0 6px 1.8px rgba(0, 93, 255, 0.2);
          }
          100% {
            transform: rotate(450deg);
            box-shadow:
              0 6px 12px 0 #4dc8fd inset,
              0 12px 18px 0 #005dff inset,
              0 36px 36px 0 #1e40af inset,
              0 0 3px 1.2px rgba(56, 189, 248, 0.3),
              0 0 6px 1.8px rgba(0, 93, 255, 0.2);
          }
        }

        @keyframes loaderLetter {
          0%, 100% {
            opacity: 0.5;
            transform: translateY(0);
          }
          20% {
            opacity: 1;
            transform: scale(1.1);
          }
          40% {
            opacity: 0.7;
            transform: translateY(0);
          }
        }

        @keyframes loaderFadeIn {
          from {
            opacity: 0;
            transform: translateY(6px);
          }
          to {
            opacity: 1;
            transform: translateY(0);
          }
        }
      `}</style>
    </div>
  );
};

export { AILoader };
