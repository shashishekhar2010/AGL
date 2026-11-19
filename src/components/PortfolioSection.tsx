import { useEffect, useMemo, useState } from 'react';
import {
  ArrowRight,
  ArrowUpRight,
  Beaker,
  LayoutGrid,
  Minus,
  Plus,
  Search,
  ShoppingCart,
  TableProperties,
  Trash2,
  X,
} from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { ScrollTrigger } from 'gsap/ScrollTrigger';
import {
  CHEMICAL_CATEGORIES,
  PORTFOLIO_IMAGES,
  type CartItem,
  type ChemicalCategory,
  type ProductFilterGroup,
} from '../data/alorixContent';
import {
  handleSpotlightLeave,
  handleSpotlightMove,
} from '../utils/spotlightSurface';
import { handleTiltLeave, handleTiltMove } from '../utils/tiltSurface';
import MagneticButton from './MagneticButton';
import SectionParallaxBackdrop from './SectionParallaxBackdrop';

interface PortfolioSectionProps {
  cartItems: CartItem[];
  onAddToCart: (productId: string) => void;
  onUpdateCartQuantity: (productId: string, quantity: number) => void;
  onRemoveCartItem: (productId: string) => void;
  onClearCart: () => void;
  onOpenCart: () => void;
  onEnquireCategory: (categoryTitle: string) => void;
}

const FILTER_OPTIONS: { id: ProductFilterGroup; label: string }[] = [
  { id: 'all', label: 'All Products' },
  { id: 'activated-carbon', label: 'Activated Carbon' },
  { id: 'filtration-minerals', label: 'Filtration & Minerals' },
  { id: 'specialty-chemicals', label: 'Specialty Chemicals' },
  { id: 'systems-earthing', label: 'RO, Earthing & Pots' },
];

const GROUP_LABELS: Record<Exclude<ProductFilterGroup, 'all'>, string> = {
  'activated-carbon': 'Activated Carbon & Charcoal',
  'filtration-minerals': 'Filtration Media & Minerals',
  'specialty-chemicals': 'Specialty Chemicals & Pigments',
  'systems-earthing': 'RO, Earthing & Eco-Utility',
};

export default function PortfolioSection({
  cartItems,
  onAddToCart,
  onUpdateCartQuantity,
  onRemoveCartItem,
  onClearCart,
  onOpenCart,
  onEnquireCategory,
}: PortfolioSectionProps) {
  const [selectedCategory, setSelectedCategory] =
    useState<ChemicalCategory | null>(null);
  const [activeFilter, setActiveFilter] = useState<ProductFilterGroup>('all');
  const [searchQuery, setSearchQuery] = useState('');
  const [viewMode, setViewMode] = useState<'cards' | 'matrix'>('cards');

  const cartMap = useMemo(() => {
    const map = new Map<string, CartItem>();
    cartItems.forEach((item) => map.set(item.productId, item));
    return map;
  }, [cartItems]);

  const resolvedCartEntries = useMemo(() => {
    return cartItems
      .map((item) => {
        const product = CHEMICAL_CATEGORIES.find((c) => c.id === item.productId);
        return product ? { ...item, product } : null;
      })
      .filter((entry): entry is NonNullable<typeof entry> => entry !== null);
  }, [cartItems]);

  const totalCartUnits = useMemo(
    () => resolvedCartEntries.reduce((sum, entry) => sum + entry.quantity, 0),
    [resolvedCartEntries]
  );

  const filteredCategories = useMemo(() => {
    const q = searchQuery.trim().toLowerCase();
    return CHEMICAL_CATEGORIES.filter((cat) => {
      const matchesFormat =
        activeFilter === 'all' || cat.formatGroup === activeFilter;
      if (!matchesFormat) return false;
      if (!q) return true;
      return (
        cat.title.toLowerCase().includes(q) ||
        cat.familyLabel.toLowerCase().includes(q) ||
        cat.shortDescription.toLowerCase().includes(q) ||
        cat.overview.toLowerCase().includes(q) ||
        cat.applications.some((a) => a.toLowerCase().includes(q)) ||
        cat.editableFields.packagingPlaceholder.toLowerCase().includes(q) ||
        cat.editableFields.sourcingScope.toLowerCase().includes(q)
      );
    });
  }, [activeFilter, searchQuery]);

  useEffect(() => {
    const id = window.setTimeout(() => {
      ScrollTrigger.refresh();
    }, 80);
    return () => window.clearTimeout(id);
  }, [activeFilter, searchQuery, viewMode]);

  useEffect(() => {
    if (!selectedCategory) return;
    const onKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        setSelectedCategory(null);
      }
    };
    window.addEventListener('keydown', onKeyDown);
    return () => window.removeEventListener('keydown', onKeyDown);
  }, [selectedCategory]);

  const selectedCartEntry = selectedCategory
    ? cartMap.get(selectedCategory.id)
    : undefined;

  return (
    <section
      id="products"
      className="relative overflow-hidden py-24 sm:py-32 px-4 sm:px-6 lg:px-10 border-t border-[#dfe7e0]/12"
    >
      <SectionParallaxBackdrop
        imageSrc={PORTFOLIO_IMAGES.bgPortfolioMist}
        alt="Industrial chemical storage spheres in atmospheric evening mist"
        accent="vermilion"
        opacityClass="opacity-[0.26]"
      />

      <div className="relative z-10 max-w-7xl mx-auto space-y-10">
        <div className="flex flex-col lg:flex-row lg:items-end justify-between gap-6 gs-reveal">
          <div className="space-y-3 max-w-2xl">
            <p className="text-[11px] font-medium tracking-[0.22em] uppercase text-[#e0231c]">
              Complete Product Catalogue
            </p>
            <h2
              className="font-display font-normal uppercase tracking-[-0.012em] text-[#dfe7e0] text-balance leading-[1.08]"
              style={{ fontSize: 'clamp(1.85rem, 3.2vw, 2.85rem)' }}
            >
              ACTIVATED CARBON, FILTRATION MEDIA &amp; INDUSTRIAL CHEMICALS.
            </h2>
            <div
              data-rule-draw="true"
              className="h-[1px] w-24 bg-[#e0231c]/75 origin-left"
            />
          </div>
          <p className="text-sm text-[#9aa5a0] max-w-md leading-relaxed">
            Browse all {CHEMICAL_CATEGORIES.length} product lines, add required
            items to your order cart, set quantities and delivery address, and
            send directly via WhatsApp.
          </p>
        </div>

        {/* Interactive Filter, Search, Layout & Order Cart Toolbar */}
        <div className="flex flex-wrap items-center justify-between gap-4 border-y border-[#dfe7e0]/12 py-4 gs-reveal">
          <div
            role="group"
            aria-label="Filter products by chemical family"
            className="flex flex-wrap items-center gap-2"
          >
            {FILTER_OPTIONS.map((opt) => {
              const isActive = activeFilter === opt.id;
              return (
                <button
                  key={opt.id}
                  type="button"
                  onClick={() => setActiveFilter(opt.id)}
                  className={`px-3.5 py-2 text-xs font-medium rounded-md border transition-colors duration-200 whitespace-nowrap shrink-0 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#e0231c] ${
                    isActive
                      ? 'bg-[#e0231c] border-[#e0231c] text-white'
                      : 'bg-[#070a0f]/80 border-[#dfe7e0]/12 text-[#b4bfb7] hover:border-[#dfe7e0]/30 hover:text-[#dfe7e0]'
                  }`}
                >
                  {opt.label}
                </button>
              );
            })}
          </div>

          <div className="flex flex-wrap items-center gap-3">
            <div className="relative">
              <Search className="w-3.5 h-3.5 text-[#8a968f] absolute left-3 top-1/2 -translate-y-1/2 pointer-events-none" />
              <input
                type="search"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                aria-label="Search chemical and filtration products"
                placeholder="Search carbon, MnO2, 4A..."
                className="w-48 sm:w-56 pl-8 pr-3 py-1.5 text-xs text-[#dfe7e0] bg-[#070a0f]/85 border border-[#dfe7e0]/15 rounded-md placeholder:text-[#8a968f] focus:outline-none focus:border-[#e0231c]"
              />
            </div>

            <p className="text-xs font-mono-tech tabular-nums text-[#8a968f]">
              {filteredCategories.length} of {CHEMICAL_CATEGORIES.length} products
            </p>

            <div
              role="group"
              aria-label="Portfolio layout view"
              className="inline-flex items-center gap-1 p-1 rounded-md bg-[#070a0f]/85 border border-[#dfe7e0]/12"
            >
              <button
                type="button"
                onClick={() => setViewMode('cards')}
                aria-pressed={viewMode === 'cards'}
                className={`inline-flex items-center gap-1.5 px-2.5 py-1.5 text-xs rounded transition-colors whitespace-nowrap shrink-0 ${
                  viewMode === 'cards'
                    ? 'bg-[#e0231c] text-white'
                    : 'text-[#9aa5a0] hover:text-[#dfe7e0]'
                }`}
              >
                <LayoutGrid className="w-3.5 h-3.5" />
                <span>Cards</span>
              </button>
              <button
                type="button"
                onClick={() => setViewMode('matrix')}
                aria-pressed={viewMode === 'matrix'}
                className={`inline-flex items-center gap-1.5 px-2.5 py-1.5 text-xs rounded transition-colors whitespace-nowrap shrink-0 ${
                  viewMode === 'matrix'
                    ? 'bg-[#e0231c] text-white'
                    : 'text-[#9aa5a0] hover:text-[#dfe7e0]'
                }`}
              >
                <TableProperties className="w-3.5 h-3.5" />
                <span>Matrix</span>
              </button>
            </div>

            <button
              type="button"
              onClick={onOpenCart}
              className={`inline-flex items-center gap-2 px-3.5 py-2 text-xs font-medium rounded-md border transition-colors whitespace-nowrap shrink-0 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#e8ad26] ${
                resolvedCartEntries.length > 0
                  ? 'bg-[#e8ad26]/15 border-[#e8ad26]/65 text-[#e8ad26] hover:bg-[#e8ad26]/22'
                  : 'bg-[#070a0f]/85 border-[#dfe7e0]/15 text-[#dfe7e0] hover:border-[#e8ad26]/50'
              }`}
            >
              <ShoppingCart className="w-3.5 h-3.5" />
              <span className="font-mono-tech tabular-nums">
                Cart ({resolvedCartEntries.length})
              </span>
            </button>
          </div>
        </div>

        {filteredCategories.length === 0 ? (
          <div className="rounded-xl surface-panel p-10 text-center space-y-4">
            <p className="text-sm text-[#b4bfb7]">
              No products match &ldquo;{searchQuery}&rdquo; under the selected category filter.
            </p>
            <button
              type="button"
              onClick={() => {
                setSearchQuery('');
                setActiveFilter('all');
              }}
              className="px-4 py-2 text-xs font-medium text-white bg-[#e0231c] hover:bg-[#c81e17] rounded-md transition-colors"
            >
              Reset Filters
            </button>
          </div>
        ) : viewMode === 'cards' ? (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {filteredCategories.map((category) => {
              const cartEntry = cartMap.get(category.id);
              return (
                <article
                  key={category.id}
                  onPointerMove={(e) => {
                    handleSpotlightMove(e);
                    handleTiltMove(e, 1.8);
                  }}
                  onPointerLeave={(e) => {
                    handleSpotlightLeave(e);
                    handleTiltLeave(e);
                  }}
                  className="spotlight-card tilt-surface group relative rounded-xl surface-panel overflow-hidden flex flex-col transition-colors duration-300 hover:border-[#e0231c]/55"
                >
                  <button
                    type="button"
                    onClick={() => setSelectedCategory(category)}
                    className="text-left flex flex-col flex-1 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#e0231c]"
                  >
                    <div className="relative w-full h-56 overflow-hidden bg-[#05070a]">
                      <div className="absolute inset-0 flex flex-col items-center justify-center text-[#8a968f] bg-[#070a0f]">
                        <Beaker className="w-8 h-8 text-[#e8ad26]/65 mb-1.5" />
                        <span className="text-xs px-4 text-center">{category.title}</span>
                      </div>
                      <div data-media-parallax="true" className="relative z-10 w-full h-full">
                        <img
                          src={category.image}
                          alt={category.imageAlt}
                          referrerPolicy="no-referrer"
                          loading="lazy"
                          className="w-full h-full object-cover transition-transform duration-700 group-hover:scale-105"
                          onError={(e) => {
                            e.currentTarget.style.display = 'none';
                          }}
                        />
                      </div>
                      <div className="pointer-events-none absolute inset-x-0 bottom-0 h-28 z-20 bg-gradient-to-t from-[#070a0f]/95 via-[#070a0f]/55 to-transparent" />
                      <div className="absolute bottom-3 left-5 right-5 z-30 flex items-center gap-2 text-[11px] font-mono-tech text-[#e8ad26]">
                        <span>{category.index}</span>
                        <span aria-hidden="true" className="text-[#dfe7e0]/45">
                          ·
                        </span>
                        <span className="text-[#dfe7e0]/90 truncate">
                          {category.familyLabel}
                        </span>
                      </div>
                    </div>

                    <div className="p-6 pb-4 flex flex-col flex-1 gap-2.5">
                      <h3 className="font-display font-normal text-lg sm:text-xl text-[#dfe7e0] group-hover:text-[#e8ad26] transition-colors">
                        {category.title}
                      </h3>
                      <p className="text-sm text-[#b4bfb7] leading-relaxed">
                        {category.shortDescription}
                      </p>
                      <p className="text-xs font-mono-tech text-[#8a968f] pt-1 mt-auto">
                        {category.editableFields.sourcingScope}
                      </p>
                    </div>
                  </button>

                  <div className="px-6 pb-5 pt-3 border-t border-[#dfe7e0]/10 flex items-center justify-between gap-3">
                    <button
                      type="button"
                      onClick={() => setSelectedCategory(category)}
                      className="inline-flex items-center gap-1.5 text-xs font-medium text-[#e8ad26] hover:text-[#dfe7e0] transition-colors whitespace-nowrap shrink-0"
                    >
                      <span>Specifications</span>
                      <ArrowUpRight className="w-3.5 h-3.5" />
                    </button>

                    {cartEntry ? (
                      <div className="inline-flex items-center rounded-md border border-[#e8ad26]/65 bg-[#e8ad26]/12 overflow-hidden shrink-0">
                        <button
                          type="button"
                          onClick={() => {
                            if (cartEntry.quantity <= 1) {
                              onRemoveCartItem(category.id);
                            } else {
                              onUpdateCartQuantity(
                                category.id,
                                cartEntry.quantity - 1
                              );
                            }
                          }}
                          aria-label={`Decrease quantity for ${category.title}`}
                          className="w-7 h-8 flex items-center justify-center text-[#e8ad26] hover:bg-[#e8ad26]/20 transition-colors"
                        >
                          <Minus className="w-3.5 h-3.5" />
                        </button>
                        <button
                          type="button"
                          onClick={onOpenCart}
                          aria-label={`Open cart for ${category.title}`}
                          className="px-2.5 h-8 font-mono-tech tabular-nums text-xs text-[#dfe7e0] hover:text-[#e8ad26] transition-colors whitespace-nowrap"
                        >
                          {cartEntry.quantity} {cartEntry.unit}
                        </button>
                        <button
                          type="button"
                          onClick={() =>
                            onUpdateCartQuantity(
                              category.id,
                              cartEntry.quantity + 1
                            )
                          }
                          aria-label={`Increase quantity for ${category.title}`}
                          className="w-7 h-8 flex items-center justify-center text-[#e8ad26] hover:bg-[#e8ad26]/20 transition-colors"
                        >
                          <Plus className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    ) : (
                      <button
                        type="button"
                        onClick={() => onAddToCart(category.id)}
                        className="inline-flex items-center gap-1.5 px-3.5 py-1.5 text-xs font-medium rounded-md border bg-[#05070a]/85 border-[#dfe7e0]/18 hover:border-[#e0231c] hover:bg-[#e0231c] text-[#dfe7e0] hover:text-white transition-colors whitespace-nowrap shrink-0 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#e0231c]"
                      >
                        <ShoppingCart className="w-3.5 h-3.5" />
                        <span>Add to Cart</span>
                      </button>
                    )}
                  </div>
                </article>
              );
            })}
          </div>
        ) : (
          /* Side-by-Side Procurement Matrix View */
          <div className="rounded-xl surface-glass overflow-x-auto">
            <table className="w-full text-left border-collapse min-w-[780px]">
              <thead>
                <tr className="border-b border-[#dfe7e0]/12 text-[11px] font-medium tracking-[0.16em] uppercase text-[#8a968f]">
                  <th className="py-4 px-5">No.</th>
                  <th className="py-4 px-5">Product Name</th>
                  <th className="py-4 px-5">Product Family</th>
                  <th className="py-4 px-5">Grade &amp; Mesh Scope</th>
                  <th className="py-4 px-5">Standard Packaging</th>
                  <th className="py-4 px-5 text-right">Order Cart / Quote</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-[#dfe7e0]/10 text-sm">
                {filteredCategories.map((cat) => {
                  const cartEntry = cartMap.get(cat.id);
                  return (
                    <tr
                      key={cat.id}
                      className="hover:bg-white/[0.03] transition-colors"
                    >
                      <td className="py-4 px-5 font-mono-tech tabular-nums text-xs text-[#e8ad26]">
                        {cat.index}
                      </td>
                      <td className="py-4 px-5">
                        <button
                          type="button"
                          onClick={() => setSelectedCategory(cat)}
                          className="font-display font-normal text-[#dfe7e0] hover:text-[#e8ad26] transition-colors text-left"
                        >
                          {cat.title}
                        </button>
                      </td>
                      <td className="py-4 px-5 text-xs text-[#b4bfb7]">
                        {GROUP_LABELS[cat.formatGroup]}
                      </td>
                      <td className="py-4 px-5 text-xs text-[#9aa5a0]">
                        {cat.editableFields.sourcingScope}
                      </td>
                      <td className="py-4 px-5 text-xs text-[#9aa5a0]">
                        {cat.editableFields.packagingPlaceholder}
                      </td>
                      <td className="py-4 px-5 text-right">
                        <div className="inline-flex items-center gap-2">
                          {cartEntry ? (
                            <div className="inline-flex items-center rounded border border-[#e8ad26]/65 bg-[#e8ad26]/12">
                              <button
                                type="button"
                                onClick={() => {
                                  if (cartEntry.quantity <= 1) {
                                    onRemoveCartItem(cat.id);
                                  } else {
                                    onUpdateCartQuantity(
                                      cat.id,
                                      cartEntry.quantity - 1
                                    );
                                  }
                                }}
                                aria-label={`Decrease ${cat.title} quantity`}
                                className="px-2 py-1 text-xs text-[#e8ad26] hover:bg-[#e8ad26]/20"
                              >
                                -
                              </button>
                              <button
                                type="button"
                                onClick={onOpenCart}
                                className="px-2 py-1 font-mono-tech tabular-nums text-xs text-[#dfe7e0]"
                              >
                                {cartEntry.quantity}
                              </button>
                              <button
                                type="button"
                                onClick={() =>
                                  onUpdateCartQuantity(
                                    cat.id,
                                    cartEntry.quantity + 1
                                  )
                                }
                                aria-label={`Increase ${cat.title} quantity`}
                                className="px-2 py-1 text-xs text-[#e8ad26] hover:bg-[#e8ad26]/20"
                              >
                                +
                              </button>
                            </div>
                          ) : (
                            <button
                              type="button"
                              onClick={() => onAddToCart(cat.id)}
                              className="px-2.5 py-1.5 text-xs rounded border border-[#dfe7e0]/15 text-[#dfe7e0] hover:border-[#e8ad26] hover:text-[#e8ad26] transition-colors whitespace-nowrap shrink-0"
                            >
                              + Add to Cart
                            </button>
                          )}
                          <button
                            type="button"
                            onClick={() => onEnquireCategory(cat.title)}
                            className="px-2.5 py-1.5 text-xs text-white bg-[#e0231c] hover:bg-[#c81e17] rounded transition-colors whitespace-nowrap shrink-0"
                          >
                            Enquire
                          </button>
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}

        {/* Active Order Cart Summary Bar */}
        <AnimatePresence>
          {resolvedCartEntries.length > 0 && (
            <motion.div
              initial={{ opacity: 0, y: 16 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: 12 }}
              transition={{ duration: 0.25, ease: [0.16, 1, 0.3, 1] }}
              className="rounded-xl surface-glass p-5 sm:p-6 flex flex-col lg:flex-row lg:items-center justify-between gap-5 border border-[#e8ad26]/40"
            >
              <div className="space-y-1.5">
                <p className="text-[11px] font-medium tracking-[0.18em] uppercase text-[#e8ad26]">
                  Order Cart · {resolvedCartEntries.length}{' '}
                  {resolvedCartEntries.length === 1 ? 'Product' : 'Products'} (
                  {totalCartUnits} Total Qty)
                </p>
                <p className="text-sm text-[#dfe7e0]">
                  {resolvedCartEntries
                    .map(
                      (entry) =>
                        `${entry.product.title} (${entry.quantity} ${entry.unit})`
                    )
                    .join(' · ')}
                </p>
              </div>

              <div className="flex flex-wrap items-center gap-3 shrink-0">
                <button
                  type="button"
                  onClick={onClearCart}
                  className="inline-flex items-center gap-1.5 px-3.5 py-2.5 text-xs font-medium text-[#b4bfb7] hover:text-[#dfe7e0] border border-[#dfe7e0]/15 rounded-md transition-colors whitespace-nowrap shrink-0"
                >
                  <Trash2 className="w-3.5 h-3.5" />
                  <span>Clear Cart</span>
                </button>
                <MagneticButton
                  type="button"
                  onClick={onOpenCart}
                  className="btn-kage-sheen inline-flex items-center gap-2 px-5 py-2.5 text-xs font-medium uppercase tracking-[0.06em] text-white bg-[#e0231c] hover:bg-[#c81e17] rounded-md transition-colors whitespace-nowrap shrink-0"
                >
                  <ShoppingCart className="w-4 h-4" />
                  <span>Review &amp; Order on WhatsApp</span>
                  <ArrowRight className="w-4 h-4" />
                </MagneticButton>
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </div>

      <AnimatePresence>
        {selectedCategory && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.2 }}
            className="fixed inset-0 z-50 bg-[#020305]/90 flex items-center justify-center p-4 sm:p-6"
            role="dialog"
            aria-modal="true"
            aria-labelledby="category-modal-title"
            onClick={() => setSelectedCategory(null)}
          >
            <motion.div
              initial={{ opacity: 0, y: 20, scale: 0.97 }}
              animate={{ opacity: 1, y: 0, scale: 1 }}
              exit={{ opacity: 0, y: 12, scale: 0.98 }}
              transition={{ duration: 0.25, ease: [0.16, 1, 0.3, 1] }}
              onClick={(e) => e.stopPropagation()}
              className="w-full max-w-2xl rounded-xl surface-glass overflow-hidden max-h-[90vh] overflow-y-auto"
            >
              <div className="relative h-52 sm:h-60 bg-[#05070a]">
                <img
                  src={selectedCategory.image}
                  alt={selectedCategory.imageAlt}
                  referrerPolicy="no-referrer"
                  className="w-full h-full object-cover"
                />
                <div className="absolute inset-0 bg-gradient-to-t from-[#05070a] via-[#05070a]/45 to-transparent" />
                <button
                  type="button"
                  onClick={() => setSelectedCategory(null)}
                  aria-label="Close product specification overview"
                  className="absolute top-4 right-4 w-10 h-10 rounded-md bg-[#05070a]/85 border border-[#dfe7e0]/15 text-[#b4bfb7] hover:text-[#dfe7e0] hover:border-[#e0231c]/65 flex items-center justify-center transition-colors"
                >
                  <X className="w-5 h-5" />
                </button>
                <div className="absolute bottom-4 left-6 right-6">
                  <p className="font-mono-tech text-xs text-[#e8ad26]">
                    Product {selectedCategory.index} · {selectedCategory.familyLabel}
                  </p>
                  <h3
                    id="category-modal-title"
                    className="font-display font-normal text-2xl text-[#dfe7e0] mt-1"
                  >
                    {selectedCategory.title}
                  </h3>
                </div>
              </div>

              <div className="p-6 sm:p-8 space-y-6">
                <p className="text-sm sm:text-base text-[#b4bfb7] leading-relaxed">
                  {selectedCategory.overview}
                </p>

                <div className="space-y-2">
                  <p className="text-xs font-medium text-[#8a968f] uppercase tracking-[0.14em]">
                    Primary Industrial Applications
                  </p>
                  <ul className="grid grid-cols-1 sm:grid-cols-3 gap-2.5 text-xs text-[#dfe7e0]">
                    {selectedCategory.applications.map((app) => (
                      <li
                        key={app}
                        className="rounded-lg bg-[#05070a]/80 border border-[#dfe7e0]/10 px-3 py-2.5 leading-snug"
                      >
                        {app}
                      </li>
                    ))}
                  </ul>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 pt-2 border-t border-[#dfe7e0]/10">
                  <div className="space-y-1">
                    <p className="text-xs font-medium text-[#8a968f]">
                      Grade &amp; Mesh Scope
                    </p>
                    <p className="text-sm text-[#dfe7e0]">
                      {selectedCategory.editableFields.sourcingScope}
                    </p>
                  </div>
                  <div className="space-y-1">
                    <p className="text-xs font-medium text-[#8a968f]">
                      Packaging Options
                    </p>
                    <p className="text-sm text-[#dfe7e0]">
                      {selectedCategory.editableFields.packagingPlaceholder}
                    </p>
                  </div>
                </div>

                <div className="rounded-lg bg-[#05070a]/85 border border-[#dfe7e0]/10 px-4 py-3 text-xs text-[#b4bfb7]">
                  {selectedCategory.editableFields.documentationNote}
                </div>

                <div className="flex flex-wrap items-center justify-end gap-3 pt-2">
                  {selectedCartEntry ? (
                    <button
                      type="button"
                      onClick={() => {
                        setSelectedCategory(null);
                        onOpenCart();
                      }}
                      className="inline-flex items-center gap-2 px-4 py-2.5 text-xs font-medium text-[#e8ad26] hover:text-[#dfe7e0] border border-[#e8ad26]/55 bg-[#e8ad26]/12 rounded-md transition-colors whitespace-nowrap shrink-0"
                    >
                      <ShoppingCart className="w-3.5 h-3.5" />
                      <span>
                        In Cart ({selectedCartEntry.quantity}{' '}
                        {selectedCartEntry.unit}) · Open Order
                      </span>
                    </button>
                  ) : (
                    <button
                      type="button"
                      onClick={() => onAddToCart(selectedCategory.id)}
                      className="inline-flex items-center gap-2 px-4 py-2.5 text-xs font-medium text-[#e8ad26] hover:text-[#dfe7e0] border border-[#e8ad26]/45 rounded-md transition-colors whitespace-nowrap shrink-0"
                    >
                      <ShoppingCart className="w-3.5 h-3.5" />
                      <span>Add to Order Cart</span>
                    </button>
                  )}

                  <button
                    type="button"
                    onClick={() => setSelectedCategory(null)}
                    className="px-4 py-2.5 text-xs font-medium text-[#b4bfb7] hover:text-[#dfe7e0] border border-[#dfe7e0]/15 rounded-md transition-colors whitespace-nowrap shrink-0"
                  >
                    Close
                  </button>
                  <button
                    type="button"
                    onClick={() => {
                      const title = selectedCategory.title;
                      setSelectedCategory(null);
                      onEnquireCategory(title);
                    }}
                    className="inline-flex items-center gap-2 px-5 py-2.5 text-xs font-medium uppercase tracking-[0.08em] text-white bg-[#e0231c] hover:bg-[#c81e17] rounded-md transition-colors whitespace-nowrap shrink-0"
                  >
                    <span>Request Product Quote</span>
                    <ArrowUpRight className="w-4 h-4" />
                  </button>
                </div>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </section>
  );
}
