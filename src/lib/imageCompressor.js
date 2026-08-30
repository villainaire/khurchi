// src/lib/imageCompressor.js

const MAX_PHOTOS = 3;
const MAX_DIMENSION = 1200;
const JPEG_QUALITY = 0.75;
const MAX_COMBINED_BYTES = 4 * 1024 * 1024; // 4MB safe email attachment budget

/**
 * Resizes and compresses an image in browser using Canvas
 */
export async function compressImage(file) {
  return new Promise((resolve, reject) => {
    if (!file || !file.type.startsWith("image/")) {
      return reject(new Error("Please upload a valid image file (JPG, PNG, or WebP)."));
    }

    const reader = new FileReader();
    reader.onerror = () => reject(new Error("Failed to read image file."));
    reader.onload = (e) => {
      const img = new Image();
      img.onerror = () => reject(new Error("Failed to decode image."));
      img.onload = () => {
        let width = img.width;
        let height = img.height;

        // Calculate scaled dimensions
        if (width > MAX_DIMENSION || height > MAX_DIMENSION) {
          if (width > height) {
            height = Math.round((height * MAX_DIMENSION) / width);
            width = MAX_DIMENSION;
          } else {
            width = Math.round((width * MAX_DIMENSION) / height);
            height = MAX_DIMENSION;
          }
        }

        const canvas = document.createElement("canvas");
        canvas.width = width;
        canvas.height = height;
        const ctx = canvas.getContext("2d");
        if (!ctx) {
          return reject(new Error("Canvas not supported"));
        }

        ctx.drawImage(img, 0, 0, width, height);

        // Convert to optimized JPEG
        const dataUrl = canvas.toDataURL("image/jpeg", JPEG_QUALITY);
        const base64Data = dataUrl.replace(/^data:image\/[a-zA-Z+]+;base64,/, "");

        const byteLength = Math.round((base64Data.length * 3) / 4);
        const cleanName = file.name ? file.name.replace(/\.[^/.]+$/, "") + ".jpg" : "chair_photo.jpg";

        resolve({
          filename: cleanName,
          contentType: "image/jpeg",
          base64: base64Data,
          previewUrl: dataUrl,
          size: byteLength,
        });
      };
      img.src = e.target.result;
    };
    reader.readAsDataURL(file);
  });
}

/**
 * Validates combined photos payload size
 */
export function validatePhotosPayload(photos) {
  if (!photos || !photos.length) return true;
  if (photos.length > MAX_PHOTOS) {
    throw new Error(`Maximum ${MAX_PHOTOS} photos allowed.`);
  }
  const totalBytes = photos.reduce((acc, p) => acc + (p.size || 0), 0);
  if (totalBytes > MAX_COMBINED_BYTES) {
    throw new Error("Combined photo size is too large for email delivery. Please remove or replace a photo.");
  }
  return true;
}

export { MAX_PHOTOS, MAX_COMBINED_BYTES };
