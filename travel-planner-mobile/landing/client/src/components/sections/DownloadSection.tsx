/*
 * TravelAI Download CTA Section — "Obsidian Atlas" Design System
 * Full-width CTA with App Store + Google Play buttons
 * Indigo/sky glow background, phone mockup
 */
import { useRef } from "react";
import { motion, useInView } from "framer-motion";

const PHONE_MOCKUP = "https://d2xsxph8kpxj0f.cloudfront.net/310519663542440075/bsyrGChmBTCdiyKzvqgjon/phone-mockup-VsgyDLUdojg6KAd5DPmW9s.webp";

function AppStoreButton() {
  return (
    <a
      href="#"
      className="flex items-center gap-3 px-5 py-3.5 rounded-xl transition-all duration-200 hover:opacity-90 active:scale-95 group"
      style={{
        background: "rgba(255,255,255,0.06)",
        border: "1px solid rgba(255,255,255,0.12)",
      }}
      onMouseEnter={(e) => {
        (e.currentTarget as HTMLElement).style.background = "rgba(255,255,255,0.1)";
        (e.currentTarget as HTMLElement).style.borderColor = "rgba(255,255,255,0.2)";
      }}
      onMouseLeave={(e) => {
        (e.currentTarget as HTMLElement).style.background = "rgba(255,255,255,0.06)";
        (e.currentTarget as HTMLElement).style.borderColor = "rgba(255,255,255,0.12)";
      }}
    >
      {/* Apple icon */}
      <svg className="w-7 h-7 text-white shrink-0" viewBox="0 0 24 24" fill="currentColor">
        <path d="M18.71 19.5c-.83 1.24-1.71 2.45-3.05 2.47-1.34.03-1.77-.79-3.29-.79-1.53 0-2 .77-3.27.82-1.31.05-2.3-1.32-3.14-2.53C4.25 17 2.94 12.45 4.7 9.39c.87-1.52 2.43-2.48 4.12-2.51 1.28-.02 2.5.87 3.29.87.78 0 2.26-1.07 3.8-.91.65.03 2.47.26 3.64 1.98-.09.06-2.17 1.28-2.15 3.81.03 3.02 2.65 4.03 2.68 4.04-.03.07-.42 1.44-1.38 2.83M13 3.5c.73-.83 1.94-1.46 2.94-1.5.13 1.17-.34 2.35-1.04 3.19-.69.85-1.83 1.51-2.95 1.42-.15-1.15.41-2.35 1.05-3.11z"/>
      </svg>
      <div>
        <p className="text-[#9ca3af] text-xs leading-none mb-0.5">Download on the</p>
        <p className="text-white font-semibold text-base leading-none">App Store</p>
      </div>
    </a>
  );
}

function GooglePlayButton() {
  return (
    <a
      href="#"
      className="flex items-center gap-3 px-5 py-3.5 rounded-xl transition-all duration-200 hover:opacity-90 active:scale-95"
      style={{
        background: "linear-gradient(135deg, #6366f1, #0EA5E9)",
      }}
      onMouseEnter={(e) => {
        (e.currentTarget as HTMLElement).style.opacity = "0.9";
      }}
      onMouseLeave={(e) => {
        (e.currentTarget as HTMLElement).style.opacity = "1";
      }}
    >
      {/* Google Play icon */}
      <svg className="w-7 h-7 text-white shrink-0" viewBox="0 0 24 24" fill="currentColor">
        <path d="M3.18 23.76c.37.2.8.22 1.2.06l12.77-6.53-2.9-2.9-11.07 9.37zM.15 1.02C.06 1.28 0 1.56 0 1.86v20.28c0 .3.06.58.15.84l.08.08 11.36-11.36v-.27L.23.94.15 1.02zM20.13 9.96l-2.66-1.36-3.22 3.22 3.22 3.22 2.68-1.37c.77-.39.77-1.32-.02-1.71zM4.38.18L17.15 6.7l-2.9 2.9L3.18.23C3.58.07 4.01.09 4.38.18z"/>
      </svg>
      <div>
        <p className="text-white/80 text-xs leading-none mb-0.5">Get it on</p>
        <p className="text-white font-semibold text-base leading-none">Google Play</p>
      </div>
    </a>
  );
}

export default function DownloadSection() {
  const ref = useRef(null);
  const isInView = useInView(ref, { once: true, margin: "-80px" });

  return (
    <section id="download" className="py-28 relative overflow-hidden" style={{ borderTop: "1px solid rgba(255,255,255,0.06)" }} ref={ref}>
      {/* Background glow */}
      <div
        className="absolute inset-0 pointer-events-none"
        style={{
          background: "radial-gradient(ellipse 80% 60% at 50% 50%, rgba(99,102,241,0.08) 0%, transparent 70%)",
        }}
      />

      <div className="container relative z-10">
        <div
          className="rounded-2xl overflow-hidden relative"
          style={{
            background: "linear-gradient(135deg, rgba(99,102,241,0.1) 0%, rgba(14,165,233,0.06) 100%)",
            border: "1px solid rgba(99,102,241,0.2)",
          }}
        >
          {/* Top gradient line */}
          <div
            className="h-px w-full"
            style={{ background: "linear-gradient(90deg, transparent, #6366f1, #0EA5E9, transparent)" }}
          />

          <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 items-center p-10 md:p-16">
            {/* Left: Text + Buttons */}
            <motion.div
              initial={{ opacity: 0, x: -30 }}
              animate={isInView ? { opacity: 1, x: 0 } : {}}
              transition={{ duration: 0.6 }}
            >
              <div
                className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full text-xs font-semibold tracking-wide uppercase mb-6"
                style={{
                  background: "rgba(99,102,241,0.12)",
                  border: "1px solid rgba(99,102,241,0.3)",
                  color: "#a5b4fc",
                }}
              >
                Available Now
              </div>

              <h2 className="text-4xl md:text-5xl font-black text-white tracking-tight mb-4 leading-tight">
                Your next adventure
                <br />
                <span
                  style={{
                    background: "linear-gradient(135deg, #6366f1, #0EA5E9)",
                    WebkitBackgroundClip: "text",
                    WebkitTextFillColor: "transparent",
                    backgroundClip: "text",
                  }}
                >
                  starts here.
                </span>
              </h2>

              <p className="text-[#9ca3af] text-lg leading-relaxed mb-10 max-w-md">
                Download TravelAI and plan your first trip for free. No credit card required. Available on iOS and Android.
              </p>

              {/* Download buttons */}
              <div className="flex flex-col sm:flex-row gap-4 mb-8">
                <AppStoreButton />
                <GooglePlayButton />
              </div>

              {/* Trust signals */}
              <div className="flex flex-wrap items-center gap-6">
                <div className="flex items-center gap-2">
                  <div className="flex gap-0.5">
                    {[...Array(5)].map((_, i) => (
                      <svg key={i} className="w-4 h-4 text-yellow-400" fill="currentColor" viewBox="0 0 20 20">
                        <path d="M9.049 2.927c.3-.921 1.603-.921 1.902 0l1.07 3.292a1 1 0 00.95.69h3.462c.969 0 1.371 1.24.588 1.81l-2.8 2.034a1 1 0 00-.364 1.118l1.07 3.292c.3.921-.755 1.688-1.54 1.118l-2.8-2.034a1 1 0 00-1.175 0l-2.8 2.034c-.784.57-1.838-.197-1.539-1.118l1.07-3.292a1 1 0 00-.364-1.118L2.98 8.72c-.783-.57-.38-1.81.588-1.81h3.461a1 1 0 00.951-.69l1.07-3.292z" />
                      </svg>
                    ))}
                  </div>
                  <span className="text-[#9ca3af] text-sm">4.9 / 5 rating</span>
                </div>
                <div className="text-[#9ca3af] text-sm">
                  <span className="text-white font-semibold">Free</span> to start
                </div>
                <div className="text-[#9ca3af] text-sm">
                  <span className="text-white font-semibold">No</span> credit card
                </div>
              </div>
            </motion.div>

            {/* Right: Phone mockup */}
            <motion.div
              initial={{ opacity: 0, x: 30 }}
              animate={isInView ? { opacity: 1, x: 0 } : {}}
              transition={{ duration: 0.6, delay: 0.2 }}
              className="flex justify-center lg:justify-end"
            >
              <div className="relative">
                <div
                  className="absolute inset-0 blur-3xl opacity-25 rounded-full"
                  style={{ background: "radial-gradient(circle, #6366f1 0%, #0EA5E9 60%, transparent 80%)" }}
                />
                <div className="animate-float relative z-10">
                  <img
                    src={PHONE_MOCKUP}
                    alt="TravelAI app on mobile"
                    className="w-56 md:w-64 drop-shadow-2xl"
                    style={{ filter: "drop-shadow(0 30px 60px rgba(99,102,241,0.3))" }}
                  />
                </div>
              </div>
            </motion.div>
          </div>
        </div>
      </div>
    </section>
  );
}
