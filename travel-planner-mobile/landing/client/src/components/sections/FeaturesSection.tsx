/*
 * TravelAI Features Section — "Obsidian Atlas" Design System
 * 6 feature cards in a 3-col grid, hover glow, staggered entrance
 */
import { useRef } from "react";
import { motion, useInView } from "framer-motion";
import {
  BrainCircuit,
  Wallet,
  QrCode,
  Bell,
  CalendarDays,
  Globe,
} from "lucide-react";

const FEATURE_MAP = "https://d2xsxph8kpxj0f.cloudfront.net/310519663542440075/bsyrGChmBTCdiyKzvqgjon/feature-map-QUrnSZhmHp32xHhBwjFYJP.webp";

const features = [
  {
    icon: BrainCircuit,
    title: "AI Itinerary",
    description:
      "Our AI analyzes thousands of data points to craft a personalized day-by-day travel plan tailored to your preferences, pace, and budget.",
    accent: "#6366f1",
    highlight: true,
  },
  {
    icon: Wallet,
    title: "Budget Tracker",
    description:
      "Set your travel budget and watch it in real time. Smart cost breakdowns for flights, hotels, food, and activities — no surprises.",
    accent: "#0EA5E9",
  },
  {
    icon: QrCode,
    title: "QR Pass",
    description:
      "All your bookings, tickets, and reservations in one scannable QR pass. No more digging through emails at the airport.",
    accent: "#6366f1",
  },
  {
    icon: Bell,
    title: "Smart Alerts",
    description:
      "Proactive notifications for flight delays, gate changes, price drops, and local events — so you're always one step ahead.",
    accent: "#0EA5E9",
  },
  {
    icon: CalendarDays,
    title: "Day-by-Day Planning",
    description:
      "Detailed hourly schedules with travel time estimates, opening hours, and restaurant reservations built right in.",
    accent: "#6366f1",
  },
  {
    icon: Globe,
    title: "50+ Countries",
    description:
      "From Tokyo to Tuscany, TravelAI has curated local knowledge across 50+ countries and 500+ cities worldwide.",
    accent: "#0EA5E9",
    hasImage: true,
  },
];

export default function FeaturesSection() {
  const ref = useRef(null);
  const isInView = useInView(ref, { once: true, margin: "-100px" });

  return (
    <section id="features" className="py-28 relative" ref={ref}>
      {/* Section header */}
      <div className="container">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={isInView ? { opacity: 1, y: 0 } : {}}
          transition={{ duration: 0.6 }}
          className="mb-16"
        >
          <div
            className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full text-xs font-semibold tracking-wide uppercase mb-4"
            style={{
              background: "rgba(14,165,233,0.1)",
              border: "1px solid rgba(14,165,233,0.25)",
              color: "#38bdf8",
            }}
          >
            Everything You Need
          </div>
          <h2 className="text-4xl md:text-5xl font-black text-white tracking-tight mb-4">
            Built for the modern
            <br />
            <span
              style={{
                background: "linear-gradient(135deg, #6366f1, #0EA5E9)",
                WebkitBackgroundClip: "text",
                WebkitTextFillColor: "transparent",
                backgroundClip: "text",
              }}
            >
              traveler.
            </span>
          </h2>
          <p className="text-[#9ca3af] text-lg max-w-xl">
            Every feature is designed to remove friction from travel planning and put you in control from the moment you start dreaming.
          </p>
        </motion.div>

        {/* Feature Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {features.map((feature, i) => {
            const Icon = feature.icon;
            return (
              <motion.div
                key={feature.title}
                initial={{ opacity: 0, y: 30 }}
                animate={isInView ? { opacity: 1, y: 0 } : {}}
                transition={{ duration: 0.5, delay: i * 0.08 }}
                className="group relative rounded-xl p-6 transition-all duration-300 cursor-default"
                style={{
                  background: "#0f0f1a",
                  border: "1px solid rgba(255,255,255,0.07)",
                }}
                onMouseEnter={(e) => {
                  (e.currentTarget as HTMLElement).style.borderColor = `${feature.accent}55`;
                  (e.currentTarget as HTMLElement).style.boxShadow = `0 0 0 1px ${feature.accent}22, 0 8px 32px rgba(0,0,0,0.4)`;
                  (e.currentTarget as HTMLElement).style.transform = "translateY(-4px)";
                }}
                onMouseLeave={(e) => {
                  (e.currentTarget as HTMLElement).style.borderColor = "rgba(255,255,255,0.07)";
                  (e.currentTarget as HTMLElement).style.boxShadow = "none";
                  (e.currentTarget as HTMLElement).style.transform = "translateY(0)";
                }}
              >
                {/* Icon */}
                <div
                  className="w-11 h-11 rounded-lg flex items-center justify-center mb-4"
                  style={{
                    background: `${feature.accent}18`,
                    border: `1px solid ${feature.accent}30`,
                  }}
                >
                  <Icon className="w-5 h-5" style={{ color: feature.accent }} strokeWidth={2} />
                </div>

                {/* Content */}
                <h3 className="text-white font-bold text-lg mb-2">{feature.title}</h3>
                <p className="text-[#9ca3af] text-sm leading-relaxed">{feature.description}</p>

                {/* Map image for 50+ Countries card */}
                {feature.hasImage && (
                  <div className="mt-4 rounded-lg overflow-hidden" style={{ border: "1px solid rgba(255,255,255,0.06)" }}>
                    <img
                      src={FEATURE_MAP}
                      alt="World map with travel routes"
                      className="w-full h-28 object-cover opacity-70"
                    />
                  </div>
                )}

                {/* Highlight badge */}
                {feature.highlight && (
                  <div
                    className="absolute top-4 right-4 px-2 py-0.5 rounded-full text-xs font-semibold"
                    style={{
                      background: "rgba(99,102,241,0.15)",
                      border: "1px solid rgba(99,102,241,0.3)",
                      color: "#a5b4fc",
                    }}
                  >
                    Core
                  </div>
                )}
              </motion.div>
            );
          })}
        </div>
      </div>
    </section>
  );
}
