/*
 * TravelAI How It Works Section — "Obsidian Atlas" Design System
 * 3 horizontal steps with large gradient numbers and connecting lines
 * ContainerScroll animation showing app screenshot
 */
import { useRef } from "react";
import { motion, useInView } from "framer-motion";
import { MessageSquare, Wand2, Plane } from "lucide-react";
import { ContainerScroll } from "@/components/ui/container-scroll-animation";

const APP_SCREENSHOT = "https://d2xsxph8kpxj0f.cloudfront.net/310519663542440075/bsyrGChmBTCdiyKzvqgjon/app-screenshot-YSXdry6cBdBWwQXioFNfaE.webp";

const steps = [
  {
    number: "01",
    icon: MessageSquare,
    title: "Describe Your Trip",
    description:
      "Tell TravelAI where you want to go, your travel dates, budget, and interests. Natural language — no forms.",
    accent: "#6366f1",
  },
  {
    number: "02",
    icon: Wand2,
    title: "AI Builds Your Plan",
    description:
      "In under 2 minutes, our AI generates a complete itinerary with flights, hotels, activities, and a daily schedule.",
    accent: "#818cf8",
  },
  {
    number: "03",
    icon: Plane,
    title: "Travel with Confidence",
    description:
      "Access your trip on any device. Get real-time alerts, QR passes, and smart recommendations as you explore.",
    accent: "#0EA5E9",
  },
];

export default function HowItWorksSection() {
  const ref = useRef(null);
  const isInView = useInView(ref, { once: true, margin: "-80px" });

  return (
    <section id="how-it-works" className="py-28 relative" style={{ borderTop: "1px solid rgba(255,255,255,0.06)" }}>
      <div className="container" ref={ref}>
        {/* Header */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={isInView ? { opacity: 1, y: 0 } : {}}
          transition={{ duration: 0.6 }}
          className="text-center mb-20"
        >
          <div
            className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full text-xs font-semibold tracking-wide uppercase mb-4"
            style={{
              background: "rgba(99,102,241,0.1)",
              border: "1px solid rgba(99,102,241,0.25)",
              color: "#a5b4fc",
            }}
          >
            Simple Process
          </div>
          <h2 className="text-4xl md:text-5xl font-black text-white tracking-tight mb-4">
            From idea to itinerary
            <br />
            <span
              style={{
                background: "linear-gradient(135deg, #6366f1, #0EA5E9)",
                WebkitBackgroundClip: "text",
                WebkitTextFillColor: "transparent",
                backgroundClip: "text",
              }}
            >
              in 3 steps.
            </span>
          </h2>
          <p className="text-[#9ca3af] text-lg max-w-lg mx-auto">
            No travel agent. No endless tabs. Just describe your dream trip and let AI handle the rest.
          </p>
        </motion.div>

        {/* Steps */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-8 mb-4 relative">
          {/* Connecting line (desktop) */}
          <div
            className="hidden md:block absolute top-10 left-1/6 right-1/6 h-px"
            style={{ background: "linear-gradient(90deg, transparent, rgba(99,102,241,0.3), rgba(14,165,233,0.3), transparent)" }}
          />

          {steps.map((step, i) => {
            const Icon = step.icon;
            return (
              <motion.div
                key={step.number}
                initial={{ opacity: 0, y: 30 }}
                animate={isInView ? { opacity: 1, y: 0 } : {}}
                transition={{ duration: 0.5, delay: 0.2 + i * 0.15 }}
                className="relative flex flex-col items-center text-center md:items-start md:text-left"
              >
                {/* Large gradient number */}
                <div
                  className="text-8xl font-black leading-none mb-4 select-none"
                  style={{
                    background: `linear-gradient(135deg, ${step.accent}60, ${step.accent}15)`,
                    WebkitBackgroundClip: "text",
                    WebkitTextFillColor: "transparent",
                    backgroundClip: "text",
                    letterSpacing: "-0.04em",
                  }}
                >
                  {step.number}
                </div>

                {/* Icon */}
                <div
                  className="w-12 h-12 rounded-xl flex items-center justify-center mb-4"
                  style={{
                    background: `${step.accent}15`,
                    border: `1px solid ${step.accent}30`,
                  }}
                >
                  <Icon className="w-5 h-5" style={{ color: step.accent }} strokeWidth={2} />
                </div>

                <h3 className="text-white font-bold text-xl mb-3">{step.title}</h3>
                <p className="text-[#9ca3af] text-sm leading-relaxed max-w-xs">{step.description}</p>
              </motion.div>
            );
          })}
        </div>
      </div>

      {/* Container Scroll Animation */}
      <div className="mt-8">
        <ContainerScroll
          titleComponent={
            <div className="mb-8">
              <p className="text-[#9ca3af] text-base mb-2">See it in action</p>
              <h3 className="text-2xl md:text-3xl font-bold text-white">
                Your complete trip, beautifully organized
              </h3>
            </div>
          }
        >
          <img
            src={APP_SCREENSHOT}
            alt="TravelAI app showing Tokyo 7-day itinerary dashboard"
            className="mx-auto w-full h-full object-cover object-top rounded-xl"
            draggable={false}
          />
        </ContainerScroll>
      </div>
    </section>
  );
}
