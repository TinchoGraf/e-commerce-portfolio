import { useEffect, useState } from 'react';
import { ImageOff } from 'lucide-react';
import clsx from 'clsx';

export default function ProductGallery({ images = [], productName, className }) {
  const validImages = images.filter((image) => image?.url);
  const [activeIndex, setActiveIndex] = useState(0);
  const [loaded, setLoaded] = useState(false);
  const activeImage = validImages[activeIndex];

  useEffect(() => {
    setLoaded(false);
  }, [activeIndex, activeImage?.url]);

  return (
    <div className={clsx('flex flex-col gap-3', className)}>
      <div className="relative aspect-square w-full overflow-hidden rounded-2xl bg-surface-alt">
        {activeImage ? (
          <img
            key={activeImage.url}
            src={activeImage.url}
            alt={activeImage.alt_text || productName}
            loading="eager"
            onLoad={() => setLoaded(true)}
            className={clsx(
              'h-full w-full object-cover transition-opacity duration-300',
              loaded ? 'opacity-100' : 'opacity-0',
            )}
          />
        ) : (
          <div className="flex h-full w-full flex-col items-center justify-center gap-2 text-ink-soft/50">
            <ImageOff size={48} strokeWidth={1.5} />
            <span className="text-sm font-medium">TechStore</span>
          </div>
        )}
      </div>

      {validImages.length > 1 && (
        <div className="flex gap-2 overflow-x-auto pb-1">
          {validImages.map((image, index) => (
            <button
              key={`${image.url}-${index}`}
              type="button"
              onClick={() => setActiveIndex(index)}
              aria-label={`Ver imagen ${index + 1} de ${validImages.length}`}
              aria-current={index === activeIndex}
              className={clsx(
                'aspect-square w-16 shrink-0 overflow-hidden rounded-lg border-2 transition-colors sm:w-20',
                index === activeIndex
                  ? 'border-brand-600'
                  : 'border-transparent hover:border-ink-soft/30',
              )}
            >
              <img
                src={image.url}
                alt={image.alt_text || productName}
                loading="lazy"
                className="h-full w-full object-cover"
              />
            </button>
          ))}
        </div>
      )}
    </div>
  );
}
