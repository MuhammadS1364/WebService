import React, { useState, useEffect } from "react";
import { ImageOff, Calendar, GraduationCap, Sparkles, QrCode, Building2 } from "lucide-react";

export type ImageFallbackType = "programme" | "student" | "highlight" | "bank" | "wing" | "general";

interface SafeImageProps extends Omit<React.ImgHTMLAttributes<HTMLImageElement>, "src"> {
  src?: string | null;
  alt?: string;
  fallbackCategory?: ImageFallbackType;
  fallbackText?: string;
}

/**
 * Normalizes user-submitted or storage image URLs to ensure browser-compatible direct display.
 * Converts Google Drive sharing links to high-performance direct CDN URLs.
 */
export function formatDirectImageUrl(url?: string | null): string {
  if (!url || typeof url !== "string") return "";
  const trimmed = url.trim();
  if (!trimmed || trimmed === "null" || trimmed === "undefined") return "";

  // Convert Google Drive view/share links to Google's public direct image CDN:
  if (trimmed.includes("drive.google.com")) {
    const fileIdMatch =
      trimmed.match(/\/d\/([a-zA-Z0-9_-]+)/) ||
      trimmed.match(/id=([a-zA-Z0-9_-]+)/);
    if (fileIdMatch && fileIdMatch[1]) {
      return `https://lh3.googleusercontent.com/d/${fileIdMatch[1]}`;
    }
  }

  // Convert Dropbox share links to raw direct format:
  if (trimmed.includes("dropbox.com") && trimmed.includes("dl=0")) {
    return trimmed.replace("dl=0", "raw=1");
  }

  return trimmed;
}

export default function SafeImage({
  src,
  alt = "Image",
  fallbackCategory = "programme",
  fallbackText,
  className = "",
  ...props
}: SafeImageProps) {
  const [hasError, setHasError] = useState(false);

  // Reset error when src changes
  useEffect(() => {
    setHasError(false);
  }, [src]);

  const cleanSrc = formatDirectImageUrl(src);

  // Validate that source is not empty or a generic placeholder
  const isValid = Boolean(
    cleanSrc &&
    cleanSrc.length > 5 &&
    !cleanSrc.includes("via.placeholder.com")
  );

  if (hasError || !isValid) {
    // Generate initials for avatar fallback if text is available
    const label = fallbackText || alt || "";
    const initials = label
      .split(" ")
      .filter(Boolean)
      .slice(0, 2)
      .map((w) => w[0].toUpperCase())
      .join("") || "D";

    return (
      <div
        className={`flex items-center justify-center select-none overflow-hidden ${
          fallbackCategory === "student"
            ? "bg-gradient-to-br from-indigo-50 to-blue-100 text-indigo-700 border border-indigo-200"
            : fallbackCategory === "wing"
            ? "bg-gradient-to-br from-blue-50 to-indigo-100 text-blue-700 border border-blue-200"
            : "bg-slate-100 text-slate-500 border border-slate-200"
        } ${className}`}
        role="img"
        aria-label={alt}
      >
        {fallbackCategory === "student" ? (
          initials.length > 0 && initials !== "D" ? (
            <span className="font-extrabold text-xs tracking-tight">{initials}</span>
          ) : (
            <GraduationCap className="w-5 h-5 text-indigo-600 opacity-90" />
          )
        ) : fallbackCategory === "wing" ? (
          initials.length > 0 && initials !== "D" ? (
            <span className="font-extrabold text-xs tracking-tight">{initials}</span>
          ) : (
            <Building2 className="w-5 h-5 text-blue-600 opacity-90" />
          )
        ) : fallbackCategory === "programme" ? (
          <div className="flex flex-col items-center justify-center p-2 text-center">
            <Calendar className="w-6 h-6 text-indigo-500 mb-1 opacity-80" />
            <span className="text-[10px] font-bold text-slate-500 uppercase tracking-wider line-clamp-1">
              {label || "Event"}
            </span>
          </div>
        ) : fallbackCategory === "highlight" ? (
          <div className="flex flex-col items-center justify-center p-2 text-center">
            <Sparkles className="w-6 h-6 text-amber-500 mb-1 opacity-80" />
            <span className="text-[10px] font-bold text-slate-500 uppercase tracking-wider line-clamp-1">
              {label || "Highlight"}
            </span>
          </div>
        ) : fallbackCategory === "bank" ? (
          <div className="flex flex-col items-center justify-center p-2 text-center">
            <QrCode className="w-6 h-6 text-sky-600 mb-1 opacity-80" />
            <span className="text-[10px] font-bold text-slate-500 uppercase tracking-wider line-clamp-1">
              Payment QR
            </span>
          </div>
        ) : (
          <ImageOff className="w-5 h-5 text-slate-400 opacity-70" />
        )}
      </div>
    );
  }

  return (
    <img
      src={cleanSrc}
      alt={alt}
      className={className}
      loading="lazy"
      onError={() => setHasError(true)}
      {...props}
    />
  );
}
