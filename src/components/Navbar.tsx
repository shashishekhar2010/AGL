import { useState } from 'react';
import { Menu, X } from 'lucide-react';
import { COMPANY_LOGO_URL } from '../data/alorixContent';

interface NavbarProps {
  activeSection: string;
  scrolled: boolean;
  onNavigate: (sectionId: string) => void;
}

const NAV_LINKS = [
  { id: 'home', label: 'Home' },
  { id: 'about', label: 'About Us' },
  { id: 'products', label: 'Products' },
  { id: 'industries', label: 'Industries' },
  { id: 'global-reach', label: 'Global Reach' },
];

export default function Navbar({
  activeSection,
  scrolled,
  onNavigate,
}: NavbarProps) {
  const [mobileOpen, setMobileOpen] = useState(false);

  const handleLinkClick = (id: string) => {
    setMobileOpen(false);
    onNavigate(id);
  };

  return (
    <header
      className={`fixed top-0 inset-x-0 z-40 transition-all duration-300 ${
        scrolled
          ? 'bg-[#05070a]/78 backdrop-blur-md border-b border-[#dfe7e0]/12'
          : 'bg-transparent border-b border-transparent'
      }`}
    >
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-10 h-16 sm:h-20 flex items-center justify-between gap-8">
        {/* Zone 1: Brand Lockup */}
        <a
          href="/"
          onClick={(e) => {
            e.preventDefault();
            handleLinkClick('home');
          }}
          className="flex items-center gap-3 whitespace-nowrap shrink-0 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#e0231c] rounded-md"
        >
          <span className="inline-flex items-center justify-center bg-[#FAFBFD] rounded-md px-2 py-1 border border-[#dfe7e0]/20 shadow-sm">
            <img
              src={COMPANY_LOGO_URL}
              alt="Alorix Global International official logo"
              referrerPolicy="no-referrer"
              className="h-8 sm:h-9 w-auto object-contain"
            />
          </span>
          <span className="hidden sm:inline font-display font-normal text-sm tracking-[0.06em] uppercase text-[#dfe7e0]">
            Alorix Global International
          </span>
        </a>

        {/* Zone 2: Rolling Kage-style Single-Line Nav Links */}
        <nav
          aria-label="Primary navigation"
          className="hidden lg:flex items-center gap-7 text-[11px] font-medium tracking-[0.18em] uppercase"
        >
          {NAV_LINKS.map((link) => {
            const isActive = activeSection === link.id;
            const href =
              link.id === 'about'
                ? '/about'
                : link.id === 'home'
                  ? '/'
                  : `/#${link.id}`;
            return (
              <a
                key={link.id}
                href={href}
                onClick={(e) => {
                  e.preventDefault();
                  handleLinkClick(link.id);
                }}
                className={`relative py-2 whitespace-nowrap shrink-0 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#e0231c] rounded ${
                  isActive ? 'text-[#dfe7e0]' : 'text-[#b4bfb7]'
                }`}
              >
                <span className="kage-nav-link">
                  <span>{link.label}</span>
                  <span className="alt" aria-hidden="true">
                    {link.label}
                  </span>
                </span>
                <span
                  aria-hidden="true"
                  className={`absolute left-0 right-0 bottom-0 h-[1px] transition-transform duration-300 origin-left ${
                    isActive
                      ? 'scale-x-100 bg-[#e0231c]'
                      : 'scale-x-0 bg-[#dfe7e0]/40'
                  }`}
                />
              </a>
            );
          })}
        </nav>

        {/* Zone 3: Single Primary Action + Mobile Trigger */}
        <div className="flex items-center gap-3 shrink-0">
          <button
            type="button"
            onClick={() => handleLinkClick('contact')}
            className="hidden sm:inline-flex items-center justify-center px-4 py-2 text-[11px] font-medium tracking-[0.16em] uppercase text-[#dfe7e0] bg-[#0a0e14]/85 hover:bg-[#e0231c] border border-[#dfe7e0]/20 hover:border-[#e0231c] rounded-md transition-colors duration-200 whitespace-nowrap shrink-0 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#e0231c]"
          >
            Business Enquiry
          </button>

          <button
            type="button"
            onClick={() => setMobileOpen((prev) => !prev)}
            aria-expanded={mobileOpen}
            aria-label={mobileOpen ? 'Close navigation menu' : 'Open navigation menu'}
            className="lg:hidden inline-flex items-center justify-center w-11 h-11 rounded-md border border-[#dfe7e0]/15 bg-[#0a0e14]/85 text-[#dfe7e0] hover:border-[#e0231c]/70 transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#e0231c]"
          >
            {mobileOpen ? <X className="w-5 h-5" /> : <Menu className="w-5 h-5" />}
          </button>
        </div>
      </div>

      {mobileOpen && (
        <div className="lg:hidden bg-[#05070a]/96 border-b border-[#dfe7e0]/12 px-4 pt-3 pb-6">
          <nav aria-label="Mobile navigation" className="flex flex-col gap-1">
            {NAV_LINKS.map((link) => {
              const isActive = activeSection === link.id;
              const href =
                link.id === 'about'
                  ? '/about'
                  : link.id === 'home'
                    ? '/'
                    : `/#${link.id}`;
              return (
                <a
                  key={link.id}
                  href={href}
                  onClick={(e) => {
                    e.preventDefault();
                    handleLinkClick(link.id);
                  }}
                  className={`min-h-[44px] flex items-center justify-between px-3 rounded-md text-xs tracking-[0.14em] uppercase font-medium transition-colors ${
                    isActive
                      ? 'bg-[#0e141d] text-[#dfe7e0] border border-[#e0231c]/50'
                      : 'text-[#b4bfb7] hover:bg-white/5 hover:text-[#dfe7e0]'
                  }`}
                >
                  <span>{link.label}</span>
                  {isActive && (
                    <span className="text-[11px] text-[#e8ad26]">Current</span>
                  )}
                </a>
              );
            })}
            <button
              type="button"
              onClick={() => handleLinkClick('contact')}
              className="mt-3 min-h-[44px] w-full flex items-center justify-center px-4 py-2.5 text-xs tracking-[0.16em] uppercase font-medium text-white bg-[#e0231c] hover:bg-[#c81e17] rounded-md transition-colors"
            >
              Business Enquiry
            </button>
          </nav>
        </div>
      )}
    </header>
  );
}
