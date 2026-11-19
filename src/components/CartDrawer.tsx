import { useEffect, useMemo, useState, type FormEvent } from 'react';
import {
  ArrowUpRight,
  Beaker,
  Check,
  Copy,
  Eye,
  MessageCircle,
  Minus,
  Plus,
  ShoppingCart,
  Trash2,
  X,
} from 'lucide-react';
import { AnimatePresence, motion } from 'motion/react';
import {
  buildWhatsAppOrderMessage,
  buildWhatsAppOrderUrl,
  CHEMICAL_CATEGORIES,
  ORDER_UNITS,
  WHATSAPP_ORDER_DISPLAY,
  type CartItem,
  type OrderUnit,
} from '../data/alorixContent';
import MagneticButton from './MagneticButton';

interface CartDrawerProps {
  isOpen: boolean;
  onClose: () => void;
  cartItems: CartItem[];
  onUpdateQuantity: (productId: string, quantity: number) => void;
  onUpdateUnit: (productId: string, unit: OrderUnit) => void;
  onRemoveItem: (productId: string) => void;
  onClearCart: () => void;
  onBrowseProducts: () => void;
}

const CUSTOMER_STORAGE_KEY = 'alorix_order_customer_v1';

interface CustomerDraft {
  customerName: string;
  deliveryAddress: string;
  orderNotes: string;
}

function loadCustomerDraft(): CustomerDraft {
  if (typeof window === 'undefined') {
    return { customerName: '', deliveryAddress: '', orderNotes: '' };
  }
  try {
    const raw = window.localStorage.getItem(CUSTOMER_STORAGE_KEY);
    if (!raw) return { customerName: '', deliveryAddress: '', orderNotes: '' };
    const parsed = JSON.parse(raw) as Partial<CustomerDraft>;
    return {
      customerName:
        typeof parsed.customerName === 'string' ? parsed.customerName : '',
      deliveryAddress:
        typeof parsed.deliveryAddress === 'string'
          ? parsed.deliveryAddress
          : '',
      orderNotes: typeof parsed.orderNotes === 'string' ? parsed.orderNotes : '',
    };
  } catch {
    return { customerName: '', deliveryAddress: '', orderNotes: '' };
  }
}

export default function CartDrawer({
  isOpen,
  onClose,
  cartItems,
  onUpdateQuantity,
  onUpdateUnit,
  onRemoveItem,
  onClearCart,
  onBrowseProducts,
}: CartDrawerProps) {
  const [customerName, setCustomerName] = useState(
    () => loadCustomerDraft().customerName
  );
  const [deliveryAddress, setDeliveryAddress] = useState(
    () => loadCustomerDraft().deliveryAddress
  );
  const [orderNotes, setOrderNotes] = useState(
    () => loadCustomerDraft().orderNotes
  );
  const [showPreview, setShowPreview] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [launchedUrl, setLaunchedUrl] = useState<string | null>(null);
  const [copied, setCopied] = useState(false);

  const resolvedItems = useMemo(() => {
    return cartItems
      .map((item) => {
        const product = CHEMICAL_CATEGORIES.find(
          (cat) => cat.id === item.productId
        );
        if (!product) return null;
        return { ...item, product };
      })
      .filter((entry): entry is NonNullable<typeof entry> => entry !== null);
  }, [cartItems]);

  const totalUnits = useMemo(
    () => resolvedItems.reduce((sum, item) => sum + item.quantity, 0),
    [resolvedItems]
  );

  const formattedMessage = useMemo(() => {
    if (resolvedItems.length === 0) return '';
    return buildWhatsAppOrderMessage({
      items: resolvedItems.map((entry) => ({
        product: entry.product,
        quantity: entry.quantity,
        unit: entry.unit,
      })),
      customerName: customerName || '[Customer / Company Name]',
      deliveryAddress: deliveryAddress || '[Full Delivery Address]',
      orderNotes,
    });
  }, [resolvedItems, customerName, deliveryAddress, orderNotes]);

  useEffect(() => {
    if (typeof window === 'undefined') return;
    try {
      window.localStorage.setItem(
        CUSTOMER_STORAGE_KEY,
        JSON.stringify({ customerName, deliveryAddress, orderNotes })
      );
    } catch {
      // Ignore storage quota errors cleanly
    }
  }, [customerName, deliveryAddress, orderNotes]);

  useEffect(() => {
    if (!isOpen) return;
    const onKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
    };
    window.addEventListener('keydown', onKeyDown);
    return () => window.removeEventListener('keydown', onKeyDown);
  }, [isOpen, onClose]);

  useEffect(() => {
    setLaunchedUrl(null);
    setErrorMsg(null);
  }, [cartItems]);

  const handlePlaceOrder = (e: FormEvent) => {
    e.preventDefault();
    setErrorMsg(null);

    if (resolvedItems.length === 0) {
      setErrorMsg('Please add at least one product to your cart before ordering.');
      return;
    }

    if (customerName.trim().length < 2) {
      setErrorMsg('Please enter your full name or company name.');
      return;
    }

    if (deliveryAddress.trim().length < 8) {
      setErrorMsg(
        'Please provide a complete delivery address (street/plot, city, state, postal code).'
      );
      return;
    }

    const message = buildWhatsAppOrderMessage({
      items: resolvedItems.map((entry) => ({
        product: entry.product,
        quantity: entry.quantity,
        unit: entry.unit,
      })),
      customerName,
      deliveryAddress,
      orderNotes,
    });

    const whatsappUrl = buildWhatsAppOrderUrl(message);
    setLaunchedUrl(whatsappUrl);

    const anchor = document.createElement('a');
    anchor.href = whatsappUrl;
    anchor.target = '_blank';
    anchor.rel = 'noopener noreferrer';
    document.body.appendChild(anchor);
    anchor.click();
    document.body.removeChild(anchor);
  };

  const handleCopyMessage = async () => {
    if (!formattedMessage) return;
    try {
      await navigator.clipboard.writeText(formattedMessage);
      setCopied(true);
      window.setTimeout(() => setCopied(false), 2200);
    } catch {
      setCopied(false);
    }
  };

  return (
    <AnimatePresence>
      {isOpen && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          transition={{ duration: 0.2 }}
          className="fixed inset-0 z-50 bg-[#020305]/85 backdrop-blur-sm flex justify-end"
          role="dialog"
          aria-modal="true"
          aria-labelledby="order-cart-drawer-title"
          onClick={onClose}
        >
          <motion.aside
            initial={{ x: '100%' }}
            animate={{ x: 0 }}
            exit={{ x: '100%' }}
            transition={{ duration: 0.3, ease: [0.16, 1, 0.3, 1] }}
            onClick={(e) => e.stopPropagation()}
            className="w-full max-w-xl h-full bg-[#070a0f] border-l border-[#dfe7e0]/14 flex flex-col shadow-2xl"
          >
            {/* Header */}
            <div className="px-5 sm:px-7 py-5 border-b border-[#dfe7e0]/12 flex items-center justify-between gap-4 shrink-0">
              <div className="space-y-0.5">
                <div className="flex items-center gap-2 text-[11px] font-mono-tech tracking-[0.16em] uppercase text-[#e8ad26]">
                  <ShoppingCart className="w-3.5 h-3.5" />
                  <span>WhatsApp Order Desk</span>
                </div>
                <h2
                  id="order-cart-drawer-title"
                  className="font-display font-normal text-xl sm:text-2xl text-[#dfe7e0]"
                >
                  Order Cart
                </h2>
                <p className="text-xs font-mono-tech tabular-nums text-[#8a968f]">
                  {resolvedItems.length}{' '}
                  {resolvedItems.length === 1 ? 'Product' : 'Products'} ·{' '}
                  {totalUnits} Total Qty
                </p>
              </div>

              <div className="flex items-center gap-2">
                {resolvedItems.length > 0 && (
                  <button
                    type="button"
                    onClick={onClearCart}
                    className="inline-flex items-center gap-1.5 px-3 py-2 text-xs font-medium text-[#b4bfb7] hover:text-[#e0231c] border border-[#dfe7e0]/12 rounded-md transition-colors whitespace-nowrap shrink-0"
                  >
                    <Trash2 className="w-3.5 h-3.5" />
                    <span>Clear</span>
                  </button>
                )}
                <button
                  type="button"
                  onClick={onClose}
                  aria-label="Close order cart drawer"
                  className="w-10 h-10 rounded-md border border-[#dfe7e0]/15 bg-[#0a0e14] text-[#b4bfb7] hover:text-[#dfe7e0] hover:border-[#e0231c]/65 flex items-center justify-center transition-colors"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>
            </div>

            {/* Body */}
            <div className="flex-1 overflow-y-auto px-5 sm:px-7 py-6 space-y-6">
              {resolvedItems.length === 0 ? (
                <div className="h-full min-h-[300px] flex flex-col items-center justify-center text-center space-y-4 py-10">
                  <div className="w-14 h-14 rounded-full bg-[#0d121a] border border-[#dfe7e0]/12 flex items-center justify-center text-[#e8ad26]">
                    <ShoppingCart className="w-6 h-6" />
                  </div>
                  <div className="space-y-1.5 max-w-xs">
                    <h3 className="font-display font-normal text-lg text-[#dfe7e0]">
                      Your Order Cart is Empty
                    </h3>
                    <p className="text-sm text-[#9aa5a0] leading-relaxed">
                      Add activated carbon, filtration media, specialty
                      chemicals, or systems from the catalogue to place an order
                      directly on WhatsApp.
                    </p>
                  </div>
                  <button
                    type="button"
                    onClick={() => {
                      onClose();
                      onBrowseProducts();
                    }}
                    className="px-5 py-2.5 text-xs font-medium uppercase tracking-[0.08em] text-white bg-[#e0231c] hover:bg-[#c81e17] rounded-md transition-colors whitespace-nowrap shrink-0"
                  >
                    Browse Products
                  </button>
                </div>
              ) : (
                <>
                  {/* Added Product Line Items */}
                  <div className="space-y-3">
                    <div className="flex items-center justify-between">
                      <span className="text-[11px] font-medium tracking-[0.16em] uppercase text-[#8a968f]">
                        Selected Products ({resolvedItems.length})
                      </span>
                      <button
                        type="button"
                        onClick={() => setShowPreview((prev) => !prev)}
                        className="inline-flex items-center gap-1.5 text-xs text-[#e8ad26] hover:text-[#dfe7e0] transition-colors"
                      >
                        <Eye className="w-3.5 h-3.5" />
                        <span>
                          {showPreview ? 'Hide Order Format' : 'Preview Format'}
                        </span>
                      </button>
                    </div>

                    <ul className="space-y-3">
                      {resolvedItems.map((entry, idx) => (
                        <li
                          key={entry.productId}
                          className="rounded-lg bg-[#0b1017]/90 border border-[#dfe7e0]/12 p-3.5 space-y-3"
                        >
                          <div className="flex items-start gap-3">
                            <div className="relative w-14 h-14 rounded-md overflow-hidden bg-[#05070a] border border-[#dfe7e0]/10 shrink-0">
                              <div className="absolute inset-0 flex items-center justify-center text-[#e8ad26]/65">
                                <Beaker className="w-5 h-5" />
                              </div>
                              <img
                                src={entry.product.image}
                                alt={entry.product.title}
                                referrerPolicy="no-referrer"
                                className="relative z-10 w-full h-full object-cover"
                                onError={(e) => {
                                  e.currentTarget.style.display = 'none';
                                }}
                              />
                            </div>

                            <div className="flex-1 min-w-0">
                              <p className="font-mono-tech text-[10px] text-[#e8ad26]">
                                #{String(idx + 1).padStart(2, '0')} ·{' '}
                                {entry.product.familyLabel}
                              </p>
                              <h3 className="font-display font-normal text-sm sm:text-base text-[#dfe7e0] truncate">
                                {entry.product.title}
                              </h3>
                              <p className="text-[11px] text-[#8a968f] truncate mt-0.5">
                                {entry.product.editableFields.packagingPlaceholder}
                              </p>
                            </div>

                            <button
                              type="button"
                              onClick={() => onRemoveItem(entry.productId)}
                              aria-label={`Remove ${entry.product.title} from cart`}
                              className="w-8 h-8 rounded-md text-[#8a968f] hover:text-[#e0231c] hover:bg-white/[0.04] flex items-center justify-center transition-colors shrink-0"
                            >
                              <Trash2 className="w-4 h-4" />
                            </button>
                          </div>

                          {/* Quantity Stepper + Unit Selector */}
                          <div className="flex flex-wrap items-center justify-between gap-3 pt-2 border-t border-[#dfe7e0]/8">
                            <div className="inline-flex items-center rounded-md border border-[#dfe7e0]/15 bg-[#05070a]">
                              <button
                                type="button"
                                onClick={() =>
                                  onUpdateQuantity(
                                    entry.productId,
                                    Math.max(1, entry.quantity - 1)
                                  )
                                }
                                aria-label={`Decrease quantity of ${entry.product.title}`}
                                className="w-8 h-8 flex items-center justify-center text-[#b4bfb7] hover:text-[#dfe7e0] hover:bg-white/[0.05] transition-colors"
                              >
                                <Minus className="w-3.5 h-3.5" />
                              </button>
                              <input
                                type="number"
                                min={1}
                                max={99999}
                                value={entry.quantity}
                                aria-label={`Quantity for ${entry.product.title}`}
                                onChange={(e) => {
                                  const nextVal = parseInt(e.target.value, 10);
                                  if (!Number.isNaN(nextVal) && nextVal >= 1) {
                                    onUpdateQuantity(entry.productId, nextVal);
                                  }
                                }}
                                className="w-14 text-center font-mono-tech tabular-nums text-xs text-[#dfe7e0] bg-transparent focus:outline-none py-1 [appearance:textfield] [&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:appearance-none"
                              />
                              <button
                                type="button"
                                onClick={() =>
                                  onUpdateQuantity(
                                    entry.productId,
                                    entry.quantity + 1
                                  )
                                }
                                aria-label={`Increase quantity of ${entry.product.title}`}
                                className="w-8 h-8 flex items-center justify-center text-[#b4bfb7] hover:text-[#dfe7e0] hover:bg-white/[0.05] transition-colors"
                              >
                                <Plus className="w-3.5 h-3.5" />
                              </button>
                            </div>

                            <div className="flex items-center gap-2">
                              <label
                                htmlFor={`unit-${entry.productId}`}
                                className="text-[11px] text-[#8a968f]"
                              >
                                Unit
                              </label>
                              <select
                                id={`unit-${entry.productId}`}
                                value={entry.unit}
                                onChange={(e) =>
                                  onUpdateUnit(
                                    entry.productId,
                                    e.target.value as OrderUnit
                                  )
                                }
                                className="px-2.5 py-1.5 text-xs text-[#dfe7e0] bg-[#05070a] border border-[#dfe7e0]/15 rounded-md focus:outline-none focus:border-[#e0231c]"
                              >
                                {ORDER_UNITS.map((unitOpt) => (
                                  <option key={unitOpt} value={unitOpt}>
                                    {unitOpt}
                                  </option>
                                ))}
                              </select>
                            </div>
                          </div>
                        </li>
                      ))}
                    </ul>
                  </div>

                  {/* Optional Formatted Message Preview */}
                  {showPreview && (
                    <div className="rounded-lg bg-[#05070a] border border-[#e8ad26]/30 p-4 space-y-2.5">
                      <div className="flex items-center justify-between gap-2">
                        <span className="font-mono-tech text-[10px] tracking-[0.16em] uppercase text-[#e8ad26]">
                          WhatsApp Message Format Preview
                        </span>
                        <button
                          type="button"
                          onClick={handleCopyMessage}
                          className="inline-flex items-center gap-1 text-[11px] text-[#b4bfb7] hover:text-[#dfe7e0]"
                        >
                          {copied ? (
                            <>
                              <Check className="w-3 h-3 text-[#e8ad26]" />
                              <span>Copied</span>
                            </>
                          ) : (
                            <>
                              <Copy className="w-3 h-3" />
                              <span>Copy</span>
                            </>
                          )}
                        </button>
                      </div>
                      <pre className="text-xs font-mono-tech text-[#b4bfb7] whitespace-pre-wrap leading-relaxed break-words">
                        {formattedMessage}
                      </pre>
                    </div>
                  )}

                  {/* Customer & Delivery Address Form */}
                  <form
                    id="whatsapp-order-form"
                    onSubmit={handlePlaceOrder}
                    className="space-y-4 pt-2 border-t border-[#dfe7e0]/12"
                    noValidate
                  >
                    <p className="text-[11px] font-medium tracking-[0.16em] uppercase text-[#e8ad26]">
                      Delivery Details for WhatsApp Dispatch
                    </p>

                    <div className="space-y-1.5">
                      <label
                        htmlFor="cart-customer-name"
                        className="text-xs font-medium text-[#b4bfb7]"
                      >
                        Full Name / Company Name *
                      </label>
                      <input
                        id="cart-customer-name"
                        type="text"
                        required
                        value={customerName}
                        onChange={(e) => setCustomerName(e.target.value)}
                        placeholder="e.g., Acme Water Treatment Pvt. Ltd."
                        className="w-full px-3.5 py-2.5 text-sm text-[#dfe7e0] bg-[#05070a] border border-[#dfe7e0]/15 rounded-md placeholder:text-[#6f7b75] focus:outline-none focus:border-[#e0231c]"
                      />
                    </div>

                    <div className="space-y-1.5">
                      <label
                        htmlFor="cart-delivery-address"
                        className="text-xs font-medium text-[#b4bfb7]"
                      >
                        Full Delivery Address *
                      </label>
                      <textarea
                        id="cart-delivery-address"
                        rows={3}
                        required
                        value={deliveryAddress}
                        onChange={(e) => setDeliveryAddress(e.target.value)}
                        placeholder="Plot / Street, Industrial Area, City, State, PIN / Postal Code, Country"
                        className="w-full px-3.5 py-2.5 text-sm text-[#dfe7e0] bg-[#05070a] border border-[#dfe7e0]/15 rounded-md placeholder:text-[#6f7b75] focus:outline-none focus:border-[#e0231c] resize-y"
                      />
                    </div>

                    <div className="space-y-1.5">
                      <label
                        htmlFor="cart-order-notes"
                        className="text-xs font-medium text-[#b4bfb7]"
                      >
                        Mesh Size / Packaging Notes (Optional)
                      </label>
                      <input
                        id="cart-order-notes"
                        type="text"
                        value={orderNotes}
                        onChange={(e) => setOrderNotes(e.target.value)}
                        placeholder="e.g., 12x40 mesh grade, urgent dispatch"
                        className="w-full px-3.5 py-2.5 text-sm text-[#dfe7e0] bg-[#05070a] border border-[#dfe7e0]/15 rounded-md placeholder:text-[#6f7b75] focus:outline-none focus:border-[#e0231c]"
                      />
                    </div>

                    {errorMsg && (
                      <p
                        role="alert"
                        className="text-xs text-[#ff6b66] bg-[#e0231c]/12 border border-[#e0231c]/35 rounded-md px-3.5 py-2.5"
                      >
                        {errorMsg}
                      </p>
                    )}

                    {launchedUrl && (
                      <div className="rounded-lg bg-[#0d1512] border border-[#e8ad26]/40 p-3.5 space-y-2">
                        <p className="text-xs text-[#dfe7e0] leading-relaxed">
                          Order prepared for WhatsApp ({WHATSAPP_ORDER_DISPLAY}
                          ). If WhatsApp did not open automatically, click below:
                        </p>
                        <div className="flex flex-wrap items-center gap-3">
                          <a
                            href={launchedUrl}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="inline-flex items-center gap-1.5 px-3.5 py-2 text-xs font-medium text-white bg-[#1f9d55] hover:bg-[#198748] rounded-md transition-colors whitespace-nowrap shrink-0"
                          >
                            <span>Open WhatsApp Chat</span>
                            <ArrowUpRight className="w-3.5 h-3.5" />
                          </a>
                          <button
                            type="button"
                            onClick={handleCopyMessage}
                            className="inline-flex items-center gap-1.5 px-3 py-2 text-xs text-[#b4bfb7] hover:text-[#dfe7e0] border border-[#dfe7e0]/15 rounded-md transition-colors whitespace-nowrap shrink-0"
                          >
                            {copied ? (
                              <>
                                <Check className="w-3.5 h-3.5 text-[#e8ad26]" />
                                <span>Copied Order</span>
                              </>
                            ) : (
                              <>
                                <Copy className="w-3.5 h-3.5" />
                                <span>Copy Order Text</span>
                              </>
                            )}
                          </button>
                        </div>
                      </div>
                    )}
                  </form>
                </>
              )}
            </div>

            {/* Footer Checkout CTA */}
            {resolvedItems.length > 0 && (
              <div className="px-5 sm:px-7 py-4 border-t border-[#dfe7e0]/12 bg-[#05070a]/95 shrink-0 space-y-2.5">
                <div className="flex items-center justify-between text-xs text-[#9aa5a0]">
                  <span>WhatsApp Order Destination</span>
                  <span className="font-mono-tech tabular-nums text-[#dfe7e0]">
                    {WHATSAPP_ORDER_DISPLAY}
                  </span>
                </div>
                <MagneticButton
                  type="submit"
                  form="whatsapp-order-form"
                  className="btn-kage-sheen w-full inline-flex items-center justify-center gap-2.5 px-6 py-3.5 text-xs sm:text-sm font-medium tracking-[0.08em] uppercase text-white bg-[#e0231c] hover:bg-[#c81e17] rounded-md transition-colors whitespace-nowrap shrink-0 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#e8ad26]"
                >
                  <MessageCircle className="w-4 h-4" />
                  <span>Order on WhatsApp</span>
                  <ArrowUpRight className="w-4 h-4" />
                </MagneticButton>
              </div>
            )}
          </motion.aside>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
