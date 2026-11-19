interface ChapterRailProps {
  activeSection: string;
  scrollProgress: number;
  onNavigate: (id: string) => void;
}

const CHAPTERS = [
  { id: 'home', label: '01 · Overview' },
  { id: 'products', label: '02 · Portfolio' },
  { id: 'industries', label: '03 · Industries' },
  { id: 'global-reach', label: '04 · Global Reach' },
  { id: 'workflow', label: '05 · Execution' },
  { id: 'quality', label: '06 · Quality' },
  { id: 'why-alorix', label: '07 · Why Alorix' },
  { id: 'contact', label: '08 · Enquiry' },
];

export default function ChapterRail({
  activeSection,
  scrollProgress,
  onNavigate,
}: ChapterRailProps) {
  return (
    <>
      {/* Top hairline scroll progress bar */}
      <div
        aria-hidden="true"
        className="fixed top-0 left-0 right-0 h-[2px] z-50 pointer-events-none bg-transparent"
      >
        <div
          className="h-full origin-left bg-gradient-to-r from-[#e0231c] via-[#e8ad26] to-[#dfe7e0]"
          style={{ transform: `scaleX(${scrollProgress})` }}
        />
      </div>

      {/* Right-edge editorial chapter navigation rail (xl viewports) */}
      <nav
        aria-label="Section chapters"
        className="hidden xl:flex fixed right-6 top-1/2 -translate-y-1/2 z-30 flex-col items-end gap-3"
      >
        {CHAPTERS.map((chapter) => {
          const isActive = activeSection === chapter.id;
          return (
            <button
              key={chapter.id}
              type="button"
              onClick={() => onNavigate(chapter.id)}
              aria-label={`Jump to ${chapter.label}`}
              className="group flex items-center gap-3 py-0.5 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#e0231c] rounded"
            >
              <span
                className={`text-[10px] tracking-[0.18em] uppercase transition-all duration-200 ${
                  isActive
                    ? 'opacity-100 translate-x-0 text-[#dfe7e0]'
                    : 'opacity-0 translate-x-2 group-hover:opacity-100 group-hover:translate-x-0 text-[#9aa5a0]'
                }`}
              >
                {chapter.label}
              </span>
              <span
                className={`block h-[2px] transition-all duration-300 ${
                  isActive
                    ? 'w-7 bg-[#e0231c]'
                    : 'w-3 bg-[#dfe7e0]/25 group-hover:w-5 group-hover:bg-[#e8ad26]'
                }`}
              />
            </button>
          );
        })}
      </nav>
    </>
  );
}
