/**
 * The source PNG is a square canvas with generous transparent padding around the "M" mark, so
 * it's rendered as a cropped background image (scaled + centered) rather than a plain <img> —
 * at nav-icon sizes, object-fit: contain would shrink the mark to near-illegible.
 */
export function BrandMark({ size = 18 }: { size?: number }) {
  return (
    <span
      aria-hidden
      style={{
        display: 'inline-block',
        width: size,
        height: size,
        backgroundImage: 'url(/logo-mark.png)',
        backgroundSize: '300%',
        backgroundPosition: 'center',
        backgroundRepeat: 'no-repeat',
      }}
    />
  );
}
