/**
 * LazyImage — drop-in <img> replacement with:
 *  - loading="lazy" (native browser lazy-load)
 *  - Skeleton placeholder shown while the image loads
 *  - Smooth fade-in on load (no layout shift)
 *  - Graceful fallback slot when the image errors
 *
 * Usage:
 *   <LazyImage src={url} alt="..." className="h-full w-full object-cover" />
 *   <LazyImage src={url} alt="..." aspectRatio="16/9" fallback={<Placeholder />} />
 */
import { useState } from "react";

interface LazyImageProps extends React.ImgHTMLAttributes<HTMLImageElement> {
  /** Optional fixed aspect ratio for the skeleton (e.g. "16/9", "1/1"). */
  aspectRatio?: string;
  /** Content rendered when the image fails to load. Defaults to a grey square. */
  fallback?: React.ReactNode;
  /** Extra class applied to the wrapper div (not the <img>). */
  wrapperClassName?: string;
}

export function LazyImage({
  src,
  alt = "",
  className = "",
  aspectRatio,
  fallback,
  wrapperClassName = "",
  style,
  ...rest
}: LazyImageProps) {
  const [loaded, setLoaded] = useState(false);
  const [errored, setErrored] = useState(false);

  const wrapStyle = aspectRatio ? { aspectRatio, ...style } : style;

  if (errored) {
    return (
      <div
        className={`overflow-hidden bg-pk-anthracite ${wrapperClassName}`}
        style={wrapStyle}
        aria-hidden="true"
      >
        {fallback ?? (
          <div className="flex h-full w-full items-center justify-center bg-pk-anthracite" />
        )}
      </div>
    );
  }

  return (
    <div className={`relative overflow-hidden ${wrapperClassName}`} style={wrapStyle}>
      {/* Skeleton — visible until image loads */}
      {!loaded && (
        <div className="absolute inset-0 animate-pulse bg-pk-anthracite" aria-hidden="true" />
      )}

      <img
        src={src}
        alt={alt}
        loading="lazy"
        decoding="async"
        className={`${className} transition-opacity duration-300 ${loaded ? "opacity-100" : "opacity-0"}`}
        onLoad={() => setLoaded(true)}
        onError={() => setErrored(true)}
        {...rest}
      />
    </div>
  );
}
