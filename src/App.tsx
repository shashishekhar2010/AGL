import { useCallback, useEffect, useRef, useState } from 'react';
import gsap from 'gsap';
import { ScrollTrigger } from 'gsap/ScrollTrigger';
import { AnimatePresence, motion } from 'motion/react';
import { CheckCircle2, ShoppingCart } from 'lucide-react';
import PhotoBackdropStage from './components/PhotoBackdropStage';
import FloatingAtmosphere from './components/FloatingAtmosphere';
import CursorAmbientFollower from './components/CursorAmbientFollower';
import ChapterRail from './components/ChapterRail';
import BackToTopButton from './components/BackToTopButton';
import CartDrawer from './components/CartDrawer';
import Preloader from './components/Preloader';
import Navbar from './components/Navbar';
import HeroSection from './components/HeroSection';
import AboutPage from './components/AboutPage';
import AdminPortal from './components/AdminPortal';
import PortfolioSection from './components/PortfolioSection';
import IndustriesSection from './components/IndustriesSection';
import GlobalReachSection from './components/GlobalReachSection';
import SourcingWorkflowSection from './components/SourcingWorkflowSection';
import QualitySection from './components/QualitySection';
import WhyChooseSection from './components/WhyChooseSection';
import ContactSection from './components/ContactSection';
import Footer from './components/Footer';
import {
  CHEMICAL_CATEGORIES,
  getDefaultUnitForProduct,
  ORDER_UNITS,
  type CartItem,
  type OrderUnit,
} from './data/alorixContent';

gsap.registerPlugin(ScrollTrigger);

type AppPage = 'home' | 'about' | 'admin';

const HOME_SECTION_IDS = [
  'home',
  'products',
  'industries',
  'global-reach',
  'workflow',
  'quality',
  'why-alorix',
  'contact',
];

function getBasePrefix(): string {
  const raw = (import.meta.env.BASE_URL || '/').trim();
  if (!raw || raw === '/' || raw === './' || raw === '.') return '';
  return `/${raw.replace(/^\/+|\/+$/g, '')}`;
}

function toAppUrl(route: '/' | '/about' | '/admin'): string {
  const prefix = getBasePrefix();
  if (route === '/') {
    return prefix ? `${prefix}/` : '/';
  }
  return `${prefix}${route}`;
}

function getPageFromLocation(pathname: string, hash = ''): AppPage {
  const prefix = getBasePrefix();
  let normalized = pathname || '/';
  if (prefix && normalized.toLowerCase().startsWith(prefix.toLowerCase())) {
    normalized = normalized.slice(prefix.length) || '/';
  }
  normalized = normalized.replace(/\/+$/, '') || '/';

  const hashRoute = hash.replace(/^#/, '').replace(/\/+$/, '');
  if (
    normalized === '/admin' ||
    normalized.startsWith('/admin/') ||
    hashRoute === '/admin' ||
    hashRoute === 'admin'
  ) {
    return 'admin';
  }
  if (
    normalized === '/about' ||
    hashRoute === '/about' ||
    hashRoute === 'about'
  ) {
    return 'about';
  }
  return 'home';
}

function getInitialPage(): AppPage {
  if (typeof window !== 'undefined') {
    return getPageFromLocation(window.location.pathname, window.location.hash);
  }
  return 'home';
}

const CART_STORAGE_KEY = 'alorix_order_cart_v1';

function loadInitialCart(): CartItem[] {
  if (typeof window === 'undefined') return [];
  try {
    const raw = window.localStorage.getItem(CART_STORAGE_KEY);
    if (!raw) return [];
    const parsed = JSON.parse(raw);
    if (!Array.isArray(parsed)) return [];
    return parsed.filter(
      (entry): entry is CartItem =>
        entry &&
        typeof entry.productId === 'string' &&
        CHEMICAL_CATEGORIES.some((c) => c.id === entry.productId) &&
        typeof entry.quantity === 'number' &&
        entry.quantity >= 1 &&
        ORDER_UNITS.includes(entry.unit)
    );
  } catch {
    return [];
  }
}

export default function App() {
  const [currentPage, setCurrentPage] = useState<AppPage>(getInitialPage);
  const [activeSection, setActiveSection] = useState<string>(() =>
    getInitialPage() === 'about' ? 'about' : 'home'
  );
  const [activeChapterId, setActiveChapterId] = useState('home');
  const [scrolled, setScrolled] = useState(false);
  const [scrollProgress, setScrollProgress] = useState(0);
  const [prefilledInterest, setPrefilledInterest] = useState('');
  const [cartItems, setCartItems] = useState<CartItem[]>(loadInitialCart);
  const [isCartOpen, setIsCartOpen] = useState(false);
  const [toastMessage, setToastMessage] = useState<string | null>(null);

  const pointerOffsetRef = useRef({ x: 0, y: 0 });
  const mainRef = useRef<HTMLDivElement | null>(null);
  const toastTimerRef = useRef<number | null>(null);
  const pendingScrollTargetRef = useRef<string | null>(null);

  const showToast = useCallback((msg: string) => {
    setToastMessage(msg);
    if (toastTimerRef.current) {
      window.clearTimeout(toastTimerRef.current);
    }
    toastTimerRef.current = window.setTimeout(() => {
      setToastMessage(null);
    }, 3200);
  }, []);

  const scrollToHomeTarget = useCallback((sectionId: string) => {
    if (sectionId === 'home') {
      window.scrollTo({ top: 0, behavior: 'smooth' });
      return;
    }
    const el = document.getElementById(sectionId);
    if (el) {
      el.scrollIntoView({ behavior: 'smooth', block: 'start' });
    }
  }, []);

  const navigateToSection = useCallback(
    (sectionId: string) => {
      if (sectionId === 'about') {
        const aboutUrl = toAppUrl('/about');
        if (window.location.pathname !== aboutUrl) {
          window.history.pushState({}, '', aboutUrl);
        }
        pendingScrollTargetRef.current = null;
        setCurrentPage('about');
        setActiveSection('about');
        setActiveChapterId('home');
        window.scrollTo({ top: 0, behavior: 'auto' });
        return;
      }

      if (currentPage === 'about') {
        const homeUrl = toAppUrl('/');
        if (window.location.pathname !== homeUrl) {
          window.history.pushState({}, '', homeUrl);
        }
        pendingScrollTargetRef.current = sectionId;
        setCurrentPage('home');
        setActiveSection(
          sectionId === 'workflow' ||
            sectionId === 'quality' ||
            sectionId === 'why-alorix'
            ? 'global-reach'
            : sectionId
        );
        return;
      }

      scrollToHomeTarget(sectionId);
    },
    [currentPage, scrollToHomeTarget]
  );

  useEffect(() => {
    const onRouteChange = () => {
      const nextPage = getPageFromLocation(
        window.location.pathname,
        window.location.hash
      );
      pendingScrollTargetRef.current = null;
      setCurrentPage(nextPage);
      setActiveSection(nextPage === 'about' ? 'about' : 'home');
      window.scrollTo({ top: 0, behavior: 'auto' });
    };

    window.addEventListener('popstate', onRouteChange);
    window.addEventListener('hashchange', onRouteChange);
    return () => {
      window.removeEventListener('popstate', onRouteChange);
      window.removeEventListener('hashchange', onRouteChange);
    };
  }, []);

  useEffect(() => {
    if (currentPage === 'home' && pendingScrollTargetRef.current) {
      const targetId = pendingScrollTargetRef.current;
      pendingScrollTargetRef.current = null;
      if (targetId === 'home') {
        window.scrollTo({ top: 0, behavior: 'auto' });
      } else {
        requestAnimationFrame(() => {
          scrollToHomeTarget(targetId);
        });
      }
    }
  }, [currentPage, scrollToHomeTarget]);

  const handleEnquireWithInterest = useCallback(
    (interestLabel: string) => {
      setPrefilledInterest(interestLabel);
      navigateToSection('contact');
    },
    [navigateToSection]
  );

  useEffect(() => {
    if (typeof window === 'undefined') return;
    try {
      window.localStorage.setItem(CART_STORAGE_KEY, JSON.stringify(cartItems));
    } catch {
      // Ignore storage quota errors
    }
  }, [cartItems]);

  const handleAddToCart = useCallback(
    (productId: string) => {
      const cat = CHEMICAL_CATEGORIES.find((c) => c.id === productId);
      setCartItems((prev) => {
        const existing = prev.find((item) => item.productId === productId);
        if (existing) {
          return prev.map((item) =>
            item.productId === productId
              ? { ...item, quantity: item.quantity + 1 }
              : item
          );
        }
        return [
          ...prev,
          {
            productId,
            quantity: 1,
            unit: getDefaultUnitForProduct(productId),
          },
        ];
      });
      if (cat) {
        showToast(`Added ${cat.title} to order cart`);
      }
    },
    [showToast]
  );

  const handleUpdateCartQuantity = useCallback(
    (productId: string, quantity: number) => {
      const clamped = Math.max(1, Math.min(99999, Math.floor(quantity)));
      setCartItems((prev) =>
        prev.map((item) =>
          item.productId === productId ? { ...item, quantity: clamped } : item
        )
      );
    },
    []
  );

  const handleUpdateCartUnit = useCallback(
    (productId: string, unit: OrderUnit) => {
      setCartItems((prev) =>
        prev.map((item) =>
          item.productId === productId ? { ...item, unit } : item
        )
      );
    },
    []
  );

  const handleRemoveCartItem = useCallback(
    (productId: string) => {
      const cat = CHEMICAL_CATEGORIES.find((c) => c.id === productId);
      setCartItems((prev) => prev.filter((item) => item.productId !== productId));
      if (cat) {
        showToast(`Removed ${cat.title} from order cart`);
      }
    },
    [showToast]
  );

  const handleClearCart = useCallback(() => {
    setCartItems([]);
    showToast('Cleared all items from order cart');
  }, [showToast]);

  useEffect(() => {
    let raf = 0;
    const onScroll = () => {
      if (raf) return;
      raf = requestAnimationFrame(() => {
        raf = 0;
        const y = window.scrollY;
        setScrolled(y > 32);
        const maxScroll = Math.max(
          document.documentElement.scrollHeight - window.innerHeight,
          1
        );
        setScrollProgress(Math.min(Math.max(y / maxScroll, 0), 1));
      });
    };

    const onPointerMove = (e: PointerEvent) => {
      pointerOffsetRef.current.x = (e.clientX / window.innerWidth) * 2 - 1;
      pointerOffsetRef.current.y = (e.clientY / window.innerHeight) * 2 - 1;
    };

    onScroll();
    window.addEventListener('scroll', onScroll, { passive: true });
    window.addEventListener('pointermove', onPointerMove, { passive: true });

    return () => {
      if (raf) cancelAnimationFrame(raf);
      if (toastTimerRef.current) window.clearTimeout(toastTimerRef.current);
      window.removeEventListener('scroll', onScroll);
      window.removeEventListener('pointermove', onPointerMove);
    };
  }, [currentPage]);

  useEffect(() => {
    if (currentPage !== 'home') {
      setActiveSection('about');
      return;
    }

    const observer = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          if (entry.isIntersecting) {
            const id = entry.target.id;
            setActiveChapterId(id);
            if (id === 'workflow' || id === 'quality' || id === 'why-alorix') {
              setActiveSection('global-reach');
            } else {
              setActiveSection(id);
            }
          }
        });
      },
      { rootMargin: '-38% 0px -45% 0px', threshold: 0.01 }
    );

    HOME_SECTION_IDS.forEach((id) => {
      const el = document.getElementById(id);
      if (el) observer.observe(el);
    });

    return () => observer.disconnect();
  }, [currentPage]);

  useEffect(() => {
    if (currentPage === 'admin') return;
    const prefersReduced =
      typeof window !== 'undefined' &&
      window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    if (prefersReduced || !mainRef.current) return;

    const ctx = gsap.context(() => {
      // 1. Subtle GSAP ScrollTrigger parallax on each section's main background image container
      const sectionBgs = gsap.utils.toArray<HTMLElement>(
        '[data-section-parallax-bg="true"]'
      );
      sectionBgs.forEach((bg) => {
        const parentSection = bg.closest('section');
        if (!parentSection) return;
        gsap.fromTo(
          bg,
          { yPercent: -10, scale: 1.07 },
          {
            yPercent: 10,
            scale: 1.07,
            ease: 'none',
            scrollTrigger: {
              trigger: parentSection,
              start: 'top bottom',
              end: 'bottom top',
              scrub: 1.1,
            },
          }
        );
      });

      // 2. Layered scroll parallax inside feature photography containers
      const mediaLayers = gsap.utils.toArray<HTMLElement>(
        '[data-media-parallax="true"]'
      );
      mediaLayers.forEach((media) => {
        const frame = media.parentElement || media;
        gsap.fromTo(
          media,
          { yPercent: -5, scale: 1.11 },
          {
            yPercent: 5,
            scale: 1.11,
            ease: 'none',
            scrollTrigger: {
              trigger: frame,
              start: 'top bottom',
              end: 'bottom top',
              scrub: 0.9,
            },
          }
        );
      });

      // 3. Hero foreground depth drift on initial scroll
      const heroForeground = mainRef.current?.querySelector<HTMLElement>(
        '[data-hero-parallax="true"]'
      );
      const heroSection = document.getElementById('home');
      if (heroForeground && heroSection) {
        gsap.fromTo(
          heroForeground,
          { y: 0, opacity: 1 },
          {
            y: 44,
            opacity: 0.42,
            ease: 'none',
            scrollTrigger: {
              trigger: heroSection,
              start: 'top top',
              end: 'bottom top',
              scrub: 0.85,
            },
          }
        );
      }

      // 4. Staggered section copy & card reveals
      const elements = gsap.utils.toArray<HTMLElement>('.gs-reveal');
      elements.forEach((el, idx) => {
        gsap.fromTo(
          el,
          { opacity: 0, y: 28 },
          {
            opacity: 1,
            y: 0,
            duration: 0.9,
            delay: (idx % 3) * 0.06,
            ease: 'power3.out',
            clearProps: 'transform',
            scrollTrigger: {
              trigger: el,
              start: 'top 86%',
              once: true,
            },
          }
        );
      });

      // 5. Hairline accent rule draw-in
      const rules = gsap.utils.toArray<HTMLElement>('[data-rule-draw="true"]');
      rules.forEach((rule) => {
        gsap.fromTo(
          rule,
          { scaleX: 0 },
          {
            scaleX: 1,
            duration: 0.85,
            ease: 'power3.out',
            scrollTrigger: {
              trigger: rule,
              start: 'top 88%',
              once: true,
            },
          }
        );
      });

      // 6. Editorial clip-path curtain reveals
      const curtains = gsap.utils.toArray<HTMLElement>('.gs-curtain');
      curtains.forEach((el) => {
        gsap.fromTo(
          el,
          { opacity: 0, clipPath: 'inset(14% 0% 0% 0%)', y: 20 },
          {
            opacity: 1,
            clipPath: 'inset(0% 0% 0% 0%)',
            y: 0,
            duration: 1.05,
            ease: 'power3.out',
            clearProps: 'transform,clipPath',
            scrollTrigger: {
              trigger: el,
              start: 'top 84%',
              once: true,
            },
          }
        );
      });
    }, mainRef);

    ScrollTrigger.refresh();
    return () => ctx.revert();
  }, [currentPage]);

  if (currentPage === 'admin') {
    return <AdminPortal />;
  }

  return (
    <div ref={mainRef} className="relative min-h-screen bg-[#05070a] text-[#dfe7e0]">
      <Preloader />
      <CursorAmbientFollower />

      {/* Global Atmospheric Photographic Base Layer */}
      <PhotoBackdropStage
        scrollProgress={scrollProgress}
        pointerOffsetRef={pointerOffsetRef}
      />

      {/* Mouse-Reactive Glowing Floating Orbs */}
      <FloatingAtmosphere
        pointerOffsetRef={pointerOffsetRef}
        scrollProgress={scrollProgress}
      />

      {currentPage === 'home' && (
        <ChapterRail
          activeSection={activeChapterId}
          scrollProgress={scrollProgress}
          onNavigate={navigateToSection}
        />
      )}

      <BackToTopButton
        scrollProgress={scrollProgress}
        onScrollTop={() => window.scrollTo({ top: 0, behavior: 'smooth' })}
      />

      {/* Floating Order Cart trigger whenever cart has items */}
      <AnimatePresence>
        {cartItems.length > 0 && (
          <motion.div
            initial={{ opacity: 0, y: 16, scale: 0.92 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 12, scale: 0.92 }}
            transition={{ duration: 0.25, ease: [0.16, 1, 0.3, 1] }}
            className="fixed bottom-6 right-20 sm:right-24 z-30"
          >
            <button
              type="button"
              onClick={() => setIsCartOpen(true)}
              aria-label={`Open order cart with ${cartItems.length} products`}
              className="h-11 px-4 rounded-full bg-[#e0231c] hover:bg-[#c81e17] text-white border border-[#e8ad26]/45 shadow-[0_14px_34px_rgba(224,35,28,0.38)] inline-flex items-center gap-2 transition-colors whitespace-nowrap shrink-0 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#e8ad26]"
            >
              <ShoppingCart className="w-4 h-4" />
              <span className="hidden sm:inline text-xs font-medium tracking-[0.08em] uppercase">
                Order Cart
              </span>
              <span className="font-mono-tech tabular-nums text-xs bg-[#05070a]/35 px-1.5 py-0.5 rounded">
                {cartItems.length}
              </span>
            </button>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Non-intrusive Cart feedback toast */}
      <AnimatePresence>
        {toastMessage && (
          <motion.div
            initial={{ opacity: 0, y: 16 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: 12 }}
            transition={{ duration: 0.22, ease: [0.16, 1, 0.3, 1] }}
            role="status"
            className="fixed bottom-6 left-5 sm:left-8 z-40 rounded-lg surface-glass border border-[#e8ad26]/40 px-4 py-3 flex items-center gap-3 shadow-2xl max-w-sm"
          >
            <CheckCircle2 className="w-4 h-4 text-[#e8ad26] shrink-0" />
            <span className="text-xs text-[#dfe7e0] leading-snug flex-1">
              {toastMessage}
            </span>
            {cartItems.length > 0 && !isCartOpen && (
              <button
                type="button"
                onClick={() => setIsCartOpen(true)}
                className="text-[11px] font-medium text-[#e8ad26] hover:text-white underline underline-offset-2 whitespace-nowrap shrink-0"
              >
                View Cart
              </button>
            )}
          </motion.div>
        )}
      </AnimatePresence>

      <CartDrawer
        isOpen={isCartOpen}
        onClose={() => setIsCartOpen(false)}
        cartItems={cartItems}
        onUpdateQuantity={handleUpdateCartQuantity}
        onUpdateUnit={handleUpdateCartUnit}
        onRemoveItem={handleRemoveCartItem}
        onClearCart={handleClearCart}
        onBrowseProducts={() => navigateToSection('products')}
      />

      <Navbar
        activeSection={currentPage === 'about' ? 'about' : activeSection}
        scrolled={scrolled}
        onNavigate={navigateToSection}
      />

      <main className="relative z-10">
        {currentPage === 'about' ? (
          <AboutPage onNavigateHomeSection={navigateToSection} />
        ) : (
          <>
            <HeroSection
              onExploreSolutions={() => navigateToSection('products')}
              onContactTeam={() => navigateToSection('contact')}
              onScrollDown={() => navigateToSection('products')}
              onNavigateSection={navigateToSection}
            />
            <PortfolioSection
              cartItems={cartItems}
              onAddToCart={handleAddToCart}
              onUpdateCartQuantity={handleUpdateCartQuantity}
              onRemoveCartItem={handleRemoveCartItem}
              onClearCart={handleClearCart}
              onOpenCart={() => setIsCartOpen(true)}
              onEnquireCategory={handleEnquireWithInterest}
            />
            <IndustriesSection onEnquireSector={handleEnquireWithInterest} />
            <GlobalReachSection onEnquireCountry={handleEnquireWithInterest} />
            <SourcingWorkflowSection
              onEnquireWorkflow={(stage) =>
                handleEnquireWithInterest(`Workflow Inquiry — ${stage}`)
              }
            />
            <QualitySection />
            <WhyChooseSection />
            <ContactSection prefilledInterest={prefilledInterest} />
          </>
        )}
      </main>

      <div className="relative z-10">
        <Footer
          onNavigate={navigateToSection}
          onSelectCategoryEnquiry={handleEnquireWithInterest}
        />
      </div>
    </div>
  );
}
