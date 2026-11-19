interface SectionParallaxBackdropProps {
  imageSrc: string;
  alt: string;
  accent?: 'vermilion' | 'amber' | 'neutral';
  opacityClass?: string;
}

export default function SectionParallaxBackdrop({
  imageSrc,
  alt,
  accent = 'neutral',
  opacityClass = 'opacity-[0.28]',
}: SectionParallaxBackdropProps) {
  const ambientGlow =
    accent === 'vermilion'
      ? 'radial-gradient(62% 52% at 78% 34%, rgba(224, 35, 28, 0.14), transparent 72%)'
      : accent === 'amber'
      ? 'radial-gradient(62% 52% at 22% 40%, rgba(232, 173, 38, 0.13), transparent 72%)'
      : 'radial-gradient(62% 52% at 50% 42%, rgba(223, 231, 224, 0.06), transparent 72%)';

  return (
    <div
      aria-hidden="true"
      className="pointer-events-none absolute inset-0 z-0 overflow-hidden"
    >
      {/* Single crisp section photo scrubbed by GSAP ScrollTrigger */}
      <div
        data-section-parallax-bg="true"
        className="absolute -inset-y-24 -inset-x-4 will-change-transform"
      >
        <img
          src={imageSrc}
          alt={alt}
          referrerPolicy="no-referrer"
          loading="lazy"
          className={`w-full h-full object-cover object-center ${opacityClass}`}
          onError={(e) => {
            e.currentTarget.style.display = 'none';
          }}
        />
      </div>

      {/* Subtle directional accent wash */}
      <div className="absolute inset-0" style={{ background: ambientGlow }} />

      {/* Smooth vertical feathering so adjacent sections transition cleanly without seams */}
      <div
        className="absolute inset-0"
        style={{
          background:
            'linear-gradient(180deg, #05070a 0%, rgba(5, 7, 10, 0.45) 24%, rgba(5, 7, 10, 0.48) 74%, #05070a 100%)',
        }}
      />
    </div>
  );
}
