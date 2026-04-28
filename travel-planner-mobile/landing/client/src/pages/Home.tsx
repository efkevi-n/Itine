/*
 * TravelAI — Home Page
 * "Obsidian Atlas" Design System: Precision Minimalism
 * Sections: Navbar → Hero → Features → How It Works → Stats → Testimonials → Download → Footer
 */
import Navbar from "@/components/Navbar";
import HeroSection from "@/components/sections/HeroSection";
import TrustedByBar from "@/components/sections/TrustedByBar";
import FeaturesSection from "@/components/sections/FeaturesSection";
import HowItWorksSection from "@/components/sections/HowItWorksSection";
import RoadmapSection from "@/components/sections/RoadmapSection";
import StatsSection from "@/components/sections/StatsSection";
import TestimonialsSection from "@/components/sections/TestimonialsSection";
import DownloadSection from "@/components/sections/DownloadSection";
import Footer from "@/components/Footer";

export default function Home() {
  return (
    <div className="min-h-screen" style={{ background: "#0d0d14" }}>
      <Navbar />
      <HeroSection />
      <TrustedByBar />
      <FeaturesSection />
      <HowItWorksSection />
      <RoadmapSection />
      <StatsSection />
      <TestimonialsSection />
      <DownloadSection />
      <Footer />
    </div>
  );
}
