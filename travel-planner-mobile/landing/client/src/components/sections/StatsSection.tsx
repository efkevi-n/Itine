/*
 * TravelAI Stats Section — "Obsidian Atlas" Design System
 * 4-column horizontal band with animated count-up numbers
 */
import { useRef, useEffect, useState } from "react";
import { motion, useInView } from "framer-motion";

const stats = [
  { value: 10000, suffix: "+", label: "Trips Planned", prefix: "" },
  { value: 50, suffix: "+", label: "Countries", prefix: "" },
  { value: 4.9, suffix: "", label: "App Rating", prefix: "" },
  { value: 2, suffix: "min", label: "Avg. Planning Time", prefix: "<" },
];

function useCountUp(target: number, duration: number, start: boolean) {
  const [count, setCount] = useState(0);

  useEffect(() => {
    if (!start) return;
    const isDecimal = target % 1 !== 0;
    const startTime = performance.now();

    const animate = (now: number) => {
      const elapsed = now - startTime;
      const progress = Math.min(elapsed / (duration * 1000), 1);
      const eased = 1 - Math.pow(1 - progress, 3);
      const current = eased * target;
      setCount(isDecimal ? Math.round(current * 10) / 10 : Math.floor(current));
      if (progress < 1) requestAnimationFrame(animate);
    };

    requestAnimationFrame(animate);
  }, [start, target, duration]);

  return count;
}

function StatCard({
  stat,
  index,
  isInView,
}: {
  stat: (typeof stats)[0];
  index: number;
  isInView: boolean;
}) {
  const count = useCountUp(stat.value, 1.8, isInView);
  const isDecimal = stat.value % 1 !== 0;
  const displayValue = isDecimal ? count.toFixed(1) : count.toLocaleString();

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={isInView ? { opacity: 1, y: 0 } : {}}
      transition={{ duration: 0.5, delay: index * 0.1 }}
      className="flex flex-col items-center text-center py-8 px-6"
    >
      <div className="text-5xl md:text-6xl font-black tracking-tight mb-2">
        <span
          style={{
            background: "linear-gradient(135deg, #ffffff 0%, #9ca3af 100%)",
            WebkitBackgroundClip: "text",
            WebkitTextFillColor: "transparent",
            backgroundClip: "text",
          }}
        >
          {stat.prefix}{displayValue}{stat.suffix}
        </span>
      </div>
      <p className="text-[#9ca3af] text-sm font-medium tracking-wide uppercase">{stat.label}</p>
    </motion.div>
  );
}

export default function StatsSection() {
  const ref = useRef(null);
  const isInView = useInView(ref, { once: true, margin: "-80px" });

  return (
    <section className="py-20 relative" ref={ref}>
      <div className="container">
        <div
          className="rounded-2xl overflow-hidden"
          style={{
            background: "linear-gradient(135deg, rgba(99,102,241,0.08) 0%, rgba(14,165,233,0.06) 100%)",
            border: "1px solid rgba(99,102,241,0.15)",
          }}
        >
          {/* Top accent line */}
          <div
            className="h-px w-full"
            style={{ background: "linear-gradient(90deg, transparent, #6366f1, #0EA5E9, transparent)" }}
          />

          <div className="grid grid-cols-2 md:grid-cols-4 divide-x divide-y md:divide-y-0" style={{ borderColor: "rgba(255,255,255,0.06)" }}>
            {stats.map((stat, i) => (
              <StatCard key={stat.label} stat={stat} index={i} isInView={isInView} />
            ))}
          </div>
        </div>
      </div>
    </section>
  );
}
