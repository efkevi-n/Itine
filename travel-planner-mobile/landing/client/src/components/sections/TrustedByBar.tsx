/*
 * TravelAI Trusted By Bar — "Obsidian Atlas" Design System
 * Subtle strip showing partner/press logos as text (no real logos needed)
 */
export default function TrustedByBar() {
  const mentions = [
    "TechCrunch",
    "Forbes Travel",
    "The Verge",
    "Condé Nast Traveler",
    "Wired",
    "Product Hunt",
  ];

  return (
    <div
      className="py-8"
      style={{ borderTop: "1px solid rgba(255,255,255,0.06)", borderBottom: "1px solid rgba(255,255,255,0.06)" }}
    >
      <div className="container">
        <div className="flex flex-col sm:flex-row items-center gap-6 sm:gap-10">
          <p className="text-[#4b5563] text-xs font-semibold tracking-widest uppercase whitespace-nowrap shrink-0">
            As seen in
          </p>
          <div className="flex flex-wrap justify-center sm:justify-start items-center gap-x-8 gap-y-3">
            {mentions.map((name) => (
              <span
                key={name}
                className="text-[#4b5563] text-sm font-semibold tracking-wide hover:text-[#6b7280] transition-colors duration-200 cursor-default"
                style={{ fontStyle: "italic" }}
              >
                {name}
              </span>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
