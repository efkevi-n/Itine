/*
 * TravelAI Roadmap Section — "Obsidian Atlas" Design System
 * Interactive orbital timeline showcasing product development journey
 */
import { Calendar, Code, FileText, Zap, CheckCircle, Rocket } from "lucide-react";
import RadialOrbitalTimeline from "@/components/ui/radial-orbital-timeline";

interface TimelineItem {
  id: number;
  title: string;
  date: string;
  content: string;
  category: string;
  icon: React.ElementType;
  relatedIds: number[];
  status: "completed" | "in-progress" | "pending";
  energy: number;
}

const roadmapData: TimelineItem[] = [
  {
    id: 1,
    title: "AI Foundation",
    date: "Q1 2024",
    content: "Launched core AI engine with natural language processing for trip descriptions. Beta tested with 500+ users.",
    category: "Core",
    icon: Zap,
    relatedIds: [2],
    status: "completed",
    energy: 100,
  },
  {
    id: 2,
    title: "Smart Itineraries",
    date: "Q2 2024",
    content: "Introduced personalized day-by-day planning with real-time budget tracking and activity recommendations.",
    category: "Features",
    icon: Calendar,
    relatedIds: [1, 3],
    status: "completed",
    energy: 95,
  },
  {
    id: 3,
    title: "QR Pass System",
    date: "Q3 2024",
    content: "Launched unified QR pass for all bookings, tickets, and reservations. Integrated with 50+ airlines and hotels.",
    category: "Integration",
    icon: Code,
    relatedIds: [2, 4],
    status: "in-progress",
    energy: 75,
  },
  {
    id: 4,
    title: "Smart Alerts",
    date: "Q4 2024",
    content: "Real-time notifications for flight delays, price drops, and local events. Push alerts to mobile devices.",
    category: "Features",
    icon: CheckCircle,
    relatedIds: [3, 5],
    status: "pending",
    energy: 50,
  },
  {
    id: 5,
    title: "Global Expansion",
    date: "Q1 2025",
    content: "Expand to 100+ countries with localized content, multi-language support, and regional partnerships.",
    category: "Expansion",
    icon: Rocket,
    relatedIds: [4],
    status: "pending",
    energy: 30,
  },
];

export default function RoadmapSection() {
  return (
    <section className="relative py-20 bg-gradient-to-b from-[#0d0d14] to-[#1a1a24]">
      <div className="container mb-12">
        <div className="max-w-3xl">
          <p className="text-[#4b5563] text-xs font-semibold tracking-widest uppercase mb-4">
            Our Journey
          </p>
          <h2 className="text-4xl md:text-5xl font-bold mb-4">
            <span className="text-white">Building the future of</span>
            <br />
            <span className="bg-gradient-to-r from-[#6366f1] to-[#0EA5E9] bg-clip-text text-transparent">
              travel planning
            </span>
          </h2>
          <p className="text-[#9ca3af] text-lg leading-relaxed">
            Click on any node to explore what we've built, what's in progress, and what's coming next. Each milestone represents our commitment to making travel planning smarter and more intuitive.
          </p>
        </div>
      </div>

      {/* Full-height timeline visualization */}
      <div className="relative w-full" style={{ minHeight: "600px" }}>
        <RadialOrbitalTimeline timelineData={roadmapData} />
      </div>
    </section>
  );
}
