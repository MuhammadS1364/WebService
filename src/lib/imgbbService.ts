/**
 * ImgBB Image Upload Service with High-Quality Fail-Safe Fallback
 * Processes and optimizes images, uploads to ImgBB when available,
 * and gracefully falls back to sharp, optimized data URLs if the external service fails.
 */

const DEFAULT_IMGBB_API_KEY = "7d8aabcb8104e23ce24eda325dbca52a";

export const getImgBBApiKey = (): string => {
  return import.meta.env.VITE_IMGBB_API_KEY || DEFAULT_IMGBB_API_KEY;
};

export interface ImgBBUploadResponse {
  success: boolean;
  url: string;
  displayUrl: string;
  deleteUrl?: string;
  error?: string;
}

/**
 * Optimizes, center-crops, and scales an image to a crisp 1:1 square canvas.
 * Used exclusively for circular student avatars / square user profile portraits.
 */
export async function processImageToSquareDataUrl(
  input: File | Blob | string,
  targetSize: number = 360,
  quality: number = 0.86
): Promise<string> {
  if (typeof window === "undefined") {
    return typeof input === "string" ? input : "";
  }

  return new Promise((resolve) => {
    const handleDataUrl = (dataUrl: string) => {
      const img = new Image();
      img.crossOrigin = "anonymous";
      img.onload = () => {
        try {
          const canvas = document.createElement("canvas");
          canvas.width = targetSize;
          canvas.height = targetSize;
          const ctx = canvas.getContext("2d");
          if (!ctx) {
            resolve(dataUrl);
            return;
          }

          ctx.imageSmoothingEnabled = true;
          ctx.imageSmoothingQuality = "high";

          const minDim = Math.min(img.naturalWidth || img.width, img.naturalHeight || img.height);
          const sx = ((img.naturalWidth || img.width) - minDim) / 2;
          const sy = ((img.naturalHeight || img.height) - minDim) / 2;

          ctx.fillStyle = "#ffffff";
          ctx.fillRect(0, 0, targetSize, targetSize);

          ctx.drawImage(
            img,
            sx,
            sy,
            minDim,
            minDim,
            0,
            0,
            targetSize,
            targetSize
          );

          const result = canvas.toDataURL("image/jpeg", quality);
          resolve(result);
        } catch (canvasErr) {
          console.warn("Canvas crop fallback:", canvasErr);
          resolve(dataUrl);
        }
      };

      img.onerror = () => {
        resolve(dataUrl);
      };

      img.src = dataUrl;
    };

    if (typeof input === "string") {
      if (input.startsWith("data:")) {
        handleDataUrl(input);
      } else {
        resolve(input);
      }
    } else {
      const reader = new FileReader();
      reader.onload = (e) => {
        const res = e.target?.result as string;
        if (res) handleDataUrl(res);
        else resolve("");
      };
      reader.onerror = () => resolve("");
      reader.readAsDataURL(input);
    }
  });
}

/**
 * Optimizes an image while preserving its natural, uncropped aspect ratio.
 * Decreases size by a fixed proportional ratio if the original exceeds maxDimension.
 * Guaranteed: NO CROPPING, NO CUTS. Headers, subtitles, artwork remain 100% visible.
 */
export async function processImagePreservingRatio(
  input: File | Blob | string,
  maxDimension: number = 1920,
  quality: number = 0.92
): Promise<string> {
  if (typeof window === "undefined") {
    return typeof input === "string" ? input : "";
  }

  return new Promise((resolve) => {
    const handleDataUrl = (dataUrl: string) => {
      const img = new Image();
      img.crossOrigin = "anonymous";
      img.onload = () => {
        try {
          const natW = img.naturalWidth || img.width;
          const natH = img.naturalHeight || img.height;

          let targetW = natW;
          let targetH = natH;

          // Proportional scaling down if larger than maxDimension
          if (natW > maxDimension || natH > maxDimension) {
            if (natW >= natH) {
              targetH = Math.max(1, Math.round((natH * maxDimension) / natW));
              targetW = maxDimension;
            } else {
              targetW = Math.max(1, Math.round((natW * maxDimension) / natH));
              targetH = maxDimension;
            }
          }

          const canvas = document.createElement("canvas");
          canvas.width = targetW;
          canvas.height = targetH;
          const ctx = canvas.getContext("2d");
          if (!ctx) {
            resolve(dataUrl);
            return;
          }

          ctx.imageSmoothingEnabled = true;
          ctx.imageSmoothingQuality = "high";

          // Draw full image with zero cropping
          ctx.drawImage(img, 0, 0, targetW, targetH);

          const isPng = dataUrl.startsWith("data:image/png");
          const result = canvas.toDataURL(isPng ? "image/png" : "image/jpeg", quality);
          resolve(result);
        } catch (canvasErr) {
          console.warn("Canvas preserve-ratio fallback:", canvasErr);
          resolve(dataUrl);
        }
      };

      img.onerror = () => {
        resolve(dataUrl);
      };

      img.src = dataUrl;
    };

    if (typeof input === "string") {
      if (input.startsWith("data:")) {
        handleDataUrl(input);
      } else {
        resolve(input);
      }
    } else {
      const reader = new FileReader();
      reader.onload = (e) => {
        const res = e.target?.result as string;
        if (res) handleDataUrl(res);
        else resolve("");
      };
      reader.onerror = () => resolve("");
      reader.readAsDataURL(input);
    }
  });
}

/**
 * Upload an image file or base64 string.
 * Preserves the full aspect ratio by default (no cuts or cropping).
 * Tries ImgBB cloud upload, and falls back to full-ratio optimized data URL on failure.
 */
export async function uploadImageToImgBB(
  imageInput: File | Blob | string,
  customName?: string,
  options?: { isSquareCrop?: boolean; maxDimension?: number }
): Promise<ImgBBUploadResponse> {
  let optimizedDataUrl = "";
  try {
    if (options?.isSquareCrop) {
      optimizedDataUrl = await processImageToSquareDataUrl(imageInput, options.maxDimension || 360, 0.88);
    } else {
      optimizedDataUrl = await processImagePreservingRatio(imageInput, options?.maxDimension || 1920, 0.92);
    }
  } catch (e) {
    console.warn("Image pre-processing notice:", e);
  }

  const apiKey = getImgBBApiKey();
  const formData = new FormData();

  // If uploading original uncropped file, send it directly to retain 100% native quality
  if (!options?.isSquareCrop && imageInput instanceof File) {
    formData.append("image", imageInput);
  } else if (optimizedDataUrl && optimizedDataUrl.startsWith("data:")) {
    const cleanBase64 = optimizedDataUrl.includes(",") ? optimizedDataUrl.split(",")[1] : optimizedDataUrl;
    formData.append("image", cleanBase64);
  } else if (imageInput instanceof File || imageInput instanceof Blob) {
    formData.append("image", imageInput);
  } else if (typeof imageInput === "string") {
    const cleanBase64 = imageInput.includes(",") ? imageInput.split(",")[1] : imageInput;
    formData.append("image", cleanBase64);
  }

  if (customName) {
    formData.append("name", customName);
  }

  // Attempt upload to ImgBB if key is available
  if (apiKey) {
    try {
      const response = await fetch(`https://api.imgbb.com/1/upload?key=${apiKey}`, {
        method: "POST",
        body: formData,
      });

      if (response.ok) {
        const result = await response.json();
        if (result.success && result.data?.url) {
          return {
            success: true,
            url: result.data.url,
            displayUrl: result.data.display_url || result.data.url,
            deleteUrl: result.data.delete_url,
          };
        }
      }
    } catch (uploadErr) {
      console.warn("External host unreachable, falling back to local full-ratio image:", uploadErr);
    }
  }

  // FAIL-SAFE FALLBACK: return uncropped full-ratio data URL
  if (optimizedDataUrl) {
    return {
      success: true,
      url: optimizedDataUrl,
      displayUrl: optimizedDataUrl,
    };
  }

  // Final fallback if input was an external string URL
  if (typeof imageInput === "string" && imageInput.length > 0) {
    return {
      success: true,
      url: imageInput,
      displayUrl: imageInput,
    };
  }

  return {
    success: false,
    url: "",
    displayUrl: "",
    error: "Unable to process photo. Please choose another image file.",
  };
}

/**
 * Downloads an image in full natural quality without cropping or cutting off any content.
 * Handles cross-origin images, base64 data URLs, and remote storage links reliably.
 */
export async function downloadImageFullQuality(
  imageUrl: string,
  filenameTitle?: string
): Promise<void> {
  if (!imageUrl) return;

  const sanitized = (filenameTitle || "programme-poster")
    .replace(/[^a-zA-Z0-9_-]/g, "_")
    .slice(0, 60);
  const filename = `${sanitized}.jpg`;

  // 1. Direct download for Base64 Data URLs
  if (imageUrl.startsWith("data:")) {
    const link = document.createElement("a");
    link.href = imageUrl;
    link.download = filename;
    document.body.appendChild(link);
    link.click();
    link.remove();
    return;
  }

  // 2. Fetch as Blob (ideal for direct binary download)
  try {
    const response = await fetch(imageUrl, { mode: "cors" });
    if (response.ok) {
      const blob = await response.blob();
      const blobUrl = window.URL.createObjectURL(blob);
      const link = document.createElement("a");
      link.href = blobUrl;
      link.download = filename;
      document.body.appendChild(link);
      link.click();
      link.remove();
      setTimeout(() => window.URL.revokeObjectURL(blobUrl), 2000);
      return;
    }
  } catch (corsErr) {
    console.warn("Direct blob download failed, trying canvas export:", corsErr);
  }

  // 3. Canvas draw fallback for CORS-enabled images
  try {
    await new Promise<void>((resolve, reject) => {
      const img = new Image();
      img.crossOrigin = "anonymous";
      img.onload = () => {
        try {
          const canvas = document.createElement("canvas");
          canvas.width = img.naturalWidth || img.width;
          canvas.height = img.naturalHeight || img.height;
          const ctx = canvas.getContext("2d");
          if (!ctx) throw new Error("Canvas context unavailable");

          ctx.drawImage(img, 0, 0);

          canvas.toBlob((blob) => {
            if (!blob) throw new Error("toBlob failed");
            const blobUrl = window.URL.createObjectURL(blob);
            const link = document.createElement("a");
            link.href = blobUrl;
            link.download = filename;
            document.body.appendChild(link);
            link.click();
            link.remove();
            setTimeout(() => window.URL.revokeObjectURL(blobUrl), 2000);
            resolve();
          }, "image/jpeg", 0.95);
        } catch (e) {
          reject(e);
        }
      };
      img.onerror = (e) => reject(e);
      img.src = imageUrl;
    });
    return;
  } catch (canvasErr) {
    console.warn("Canvas export fallback failed, triggering anchor download:", canvasErr);
  }

  // 4. Anchor tag fallback
  const link = document.createElement("a");
  link.href = imageUrl;
  link.target = "_blank";
  link.rel = "noopener noreferrer";
  link.download = filename;
  document.body.appendChild(link);
  link.click();
  link.remove();
}
