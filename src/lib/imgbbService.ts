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
 * Ensures student photos never stretch, squish, or distort, looking perfect on all screens.
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

          // Premium smoothing for crystal clear avatar / portrait output
          ctx.imageSmoothingEnabled = true;
          ctx.imageSmoothingQuality = "high";

          // Center crop calculation for 1:1 aspect ratio
          const minDim = Math.min(img.naturalWidth || img.width, img.naturalHeight || img.height);
          const sx = ((img.naturalWidth || img.width) - minDim) / 2;
          const sy = ((img.naturalHeight || img.height) - minDim) / 2;

          // Fill clean background in case of alpha transparency
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
        // If it's an external web URL, return as-is
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
 * Tries ImgBB cloud upload, and seamlessly falls back to optimized data URL on failure.
 * GUARANTEED to never crash or run down!
 */
export async function uploadImageToImgBB(
  imageInput: File | Blob | string,
  customName?: string
): Promise<ImgBBUploadResponse> {
  // First, generate an optimized, perfect 1:1 square image
  let optimizedDataUrl = "";
  try {
    optimizedDataUrl = await processImageToSquareDataUrl(imageInput, 360, 0.86);
  } catch (e) {
    console.warn("Image pre-processing notice:", e);
  }

  const apiKey = getImgBBApiKey();
  const formData = new FormData();

  const uploadPayload = optimizedDataUrl || (typeof imageInput === "string" ? imageInput : "");

  if (uploadPayload && uploadPayload.startsWith("data:")) {
    const cleanBase64 = uploadPayload.includes(",") ? uploadPayload.split(",")[1] : uploadPayload;
    formData.append("image", cleanBase64);
  } else if (imageInput instanceof File || imageInput instanceof Blob) {
    formData.append("image", imageInput);
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
      console.warn("External host unreachable, falling back to local optimized square image:", uploadErr);
    }
  }

  // FAIL-SAFE FALLBACK: If external host fails or is forbidden, return the crisp optimized data URL
  // This guarantees the upload function never crashes ("runs down")!
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
