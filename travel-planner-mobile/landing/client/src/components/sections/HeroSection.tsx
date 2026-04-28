/*
 * TravelAI Hero Section — "Obsidian Atlas" Design System
 * Asymmetric layout: 55% text/search left, 45% phone mockup right
 * Subtle indigo radial glow, staggered fade-in animations
 */
import { useState, useEffect } from "react";
import { motion } from "framer-motion";
import { Search, MapPin, Sparkles, ArrowRight } from "lucide-react";
import AnimatedShaderBackground from "@/components/ui/animated-shader-background";


const PHONE_MOCKUP = "https://d2xsxph8kpxj0f.cloudfront.net/310519663542440075/bsyrGChmBTCdiyKzvqgjon/phone-mockup-VsgyDLUdojg6KAd5DPmW9s.webp";

const suggestions = ["Paris, France", "Tokyo, Japan", "New York, USA", "Bali, Indonesia", "Rome, Italy"];

export default function HeroSection() {
  const [query, setQuery] = useState("");
  const [placeholder, setPlaceholder] = useState(0);
  const [isFocused, setIsFocused] = useState(false);

  useEffect(() => {
    const interval = setInterval(() => {
      setPlaceholder((p) => (p + 1) % suggestions.length);
    }, 2500);
    return () => clearInterval(interval);
  }, []);

  const containerVariants = {
    hidden: {},
    visible: { transition: { staggerChildren: 0.12 } },
  };

  const itemVariants = {
    hidden: { opacity: 0, y: 24 },
    visible: { opacity: 1, y: 0, transition: { duration: 0.6 } },
  };

  return (
    <section className="relative min-h-screen flex items-center overflow-hidden noise-overlay">
      {/* Animated Shader Background */}
      <div className="absolute inset-0 z-0">
        <AnimatedShaderBackground />
        {/* Radial glow overlay */}
        <div
          className="absolute inset-0"
          style={{
            background: "radial-gradient(ellipse 60% 50% at 30% 50%, rgba(99,102,241,0.15) 0%, transparent 70%)",
          }}
        />
        {/* Bottom fade */}
        <div
          className="absolute bottom-0 left-0 right-0 h-40"
          style={{ background: "linear-gradient(to bottom, transparent, #0d0d14)" }}
        />
      </div>

      <div className="container relative z-10 pt-28 pb-20">
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-12 lg:gap-8 items-center">
          {/* Left: Text + Search */}
          <motion.div
            variants={containerVariants}
            initial="hidden"
            animate="visible"
            className="max-w-xl"
          >
            {/* Badge */}
            <motion.div variants={itemVariants} className="inline-flex items-center gap-2 mb-6">
              <div
                className="flex items-center gap-2 px-3 py-1.5 rounded-full text-xs font-semibold tracking-wide uppercase"
                style={{
                  background: "rgba(99,102,241,0.12)",
                  border: "1px solid rgba(99,102,241,0.3)",
                  color: "#a5b4fc",
                }}
              >
                <Sparkles className="w-3 h-3" />
                AI-Powered Travel Planning
              </div>
            </motion.div>

            {/* Headline */}
            <motion.h1
              variants={itemVariants}
              className="text-5xl md:text-6xl lg:text-7xl font-black leading-[1.05] tracking-tight text-white mb-6"
            >
              Plan Smarter.
              <br />
              <span
                style={{
                  background: "linear-gradient(135deg, #6366f1 0%, #0EA5E9 100%)",
                  WebkitBackgroundClip: "text",
                  WebkitTextFillColor: "transparent",
                  backgroundClip: "text",
                }}
              >
                Travel Further.
              </span>
            </motion.h1>

            {/* Subheadline */}
            <motion.p
              variants={itemVariants}
              className="text-lg text-[#9ca3af] leading-relaxed mb-10 max-w-md"
            >
              Describe your dream trip and our AI builds a complete, personalized itinerary in under 2 minutes — flights, hotels, activities, and more.
            </motion.p>

            {/* AI Search Bar */}
            <motion.div variants={itemVariants} className="mb-8">
              <div
                className="relative flex items-center rounded-xl transition-all duration-300"
                style={{
                  background: "rgba(15,15,26,0.9)",
                  border: isFocused
                    ? "1px solid rgba(99,102,241,0.6)"
                    : "1px solid rgba(255,255,255,0.1)",
                  boxShadow: isFocused
                    ? "0 0 0 3px rgba(99,102,241,0.12), 0 8px 32px rgba(0,0,0,0.4)"
                    : "0 4px 24px rgba(0,0,0,0.3)",
                }}
              >
                <div className="flex items-center gap-3 px-4 py-4 flex-1">
                  <MapPin className="w-5 h-5 text-[#6366f1] shrink-0" />
                  <input
                    type="text"
                    value={query}
                    onChange={(e) => setQuery(e.target.value)}
                    onFocus={() => setIsFocused(true)}
                    onBlur={() => setIsFocused(false)}
                    placeholder={`Try "${suggestions[placeholder]}"`}
                    className="flex-1 bg-transparent text-white text-base outline-none placeholder:text-[#4b5563]"
                  />
                </div>
                <div className="pr-2">
                  <button
                    className="flex items-center gap-2 px-5 py-3 rounded-lg text-sm font-semibold text-white transition-all duration-200 hover:opacity-90 active:scale-95"
                    style={{ background: "linear-gradient(135deg, #6366f1, #0EA5E9)" }}
                  >
                    <Search className="w-4 h-4" />
                    <span className="hidden sm:inline">Plan Trip</span>
                  </button>
                </div>
              </div>

              {/* Quick suggestions */}
              <div className="flex flex-wrap gap-2 mt-3">
                {["Weekend in Paris", "7 Days in Japan", "Bali on a Budget"].map((s) => (
                  <button
                    key={s}
                    onClick={() => setQuery(s)}
                    className="px-3 py-1.5 rounded-lg text-xs font-medium text-[#9ca3af] hover:text-white transition-all duration-200"
                    style={{
                      background: "rgba(255,255,255,0.04)",
                      border: "1px solid rgba(255,255,255,0.08)",
                    }}
                  >
                    {s}
                  </button>
                ))}
              </div>
            </motion.div>

            {/* Social proof */}
            <motion.div variants={itemVariants} className="flex items-center gap-6">
              <div className="flex -space-x-2">
                {[
                  "https://images.unsplash.com/photo-1494790108377-be9c29b29330?w=40&h=40&fit=crop&crop=face",
                  "https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=40&h=40&fit=crop&crop=face",
                  "https://images.unsplash.com/photo-1438761681033-6461ffad8d80?w=40&h=40&fit=crop&crop=face",
                  "https://images.unsplash.com/photo-1472099645785-5658abf4ff4e?w=40&h=40&fit=crop&crop=face",
                ].map((src, i) => (
                  <img
                    key={i}
                    src={src}
                    alt="User"
                    className="w-8 h-8 rounded-full border-2 object-cover"
                    style={{ borderColor: "#0d0d14" }}
                  />
                ))}
              </div>
              <div>
                <div className="flex items-center gap-1 mb-0.5">
                  {[...Array(5)].map((_, i) => (
                    <svg key={i} className="w-3.5 h-3.5 text-yellow-400" fill="currentColor" viewBox="0 0 20 20">
                      <path d="M9.049 2.927c.3-.921 1.603-.921 1.902 0l1.07 3.292a1 1 0 00.95.69h3.462c.969 0 1.371 1.24.588 1.81l-2.8 2.034a1 1 0 00-.364 1.118l1.07 3.292c.3.921-.755 1.688-1.54 1.118l-2.8-2.034a1 1 0 00-1.175 0l-2.8 2.034c-.784.57-1.838-.197-1.539-1.118l1.07-3.292a1 1 0 00-.364-1.118L2.98 8.72c-.783-.57-.38-1.81.588-1.81h3.461a1 1 0 00.951-.69l1.07-3.292z" />
                    </svg>
                  ))}
                </div>
                <p className="text-xs text-[#9ca3af]">
                  <span className="text-white font-semibold">10,000+</span> trips planned this month
                </p>
              </div>
            </motion.div>
          </motion.div>

          {/* Right: Phone Mockup */}
          <motion.div
            initial={{ opacity: 0, x: 40 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ duration: 0.8, delay: 0.3 }}
            className="flex justify-center lg:justify-end"
          >
            <div className="relative">
              {/* Glow behind phone */}
              <div
                className="absolute inset-0 blur-3xl opacity-30 rounded-full"
                style={{ background: "radial-gradient(circle, #6366f1 0%, #0EA5E9 50%, transparent 70%)" }}
              />
              <div className="animate-float relative z-10">
                <img
                  src={PHONE_MOCKUP}
                  alt="TravelAI App showing Paris Day 1 itinerary"
                  className="w-72 md:w-80 lg:w-72 xl:w-80 drop-shadow-2xl"
                  style={{ filter: "drop-shadow(0 40px 80px rgba(99,102,241,0.25))" }}
                />
              </div>
            </div>
          </motion.div>
        </div>

        {/* Scroll indicator */}
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 1.2, duration: 0.6 }}
          className="flex justify-center mt-16"
        >
          <a
            href="#features"
            className="flex flex-col items-center gap-2 text-[#4b5563] hover:text-[#9ca3af] transition-colors group"
          >
            <span className="text-xs font-medium tracking-widest uppercase">Explore</span>
            <div className="w-5 h-8 rounded-full border border-white/10 flex items-start justify-center pt-1.5 group-hover:border-white/20 transition-colors">
              <motion.div
                animate={{ y: [0, 8, 0] }}
                transition={{ duration: 1.5, repeat: Infinity, ease: "easeInOut" }}
                className="w-1 h-1.5 rounded-full bg-[#6366f1]"
              />
            </div>
          </a>
        </motion.div>
      </div>
    </section>
  );
}
