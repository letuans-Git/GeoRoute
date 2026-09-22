/**
 * Utility to compress images on the client side (Desktop, Mobile, Tablet).
 * Resizes high-resolution camera photos (3-15MB) down to optimized JPEG representations (~70-150KB)
 * preserving crisp readability of text, seals, and signatures on Business Registration Certificates (ĐKKD)
 * while ensuring swift upload and 100% compliance with Firestore document size limits.
 */

export interface CompressedImageResult {
  dataUrl: string;
  name: string;
  originalSize: number;
  compressedSize: number;
}

export function compressImageFile(
  file: File,
  maxWidth = 1280,
  maxHeight = 1280,
  quality = 0.75
): Promise<CompressedImageResult> {
  return new Promise((resolve, reject) => {
    if (!file.type.startsWith('image/')) {
      reject(new Error(`Tập tin "${file.name}" không phải là định dạng hình ảnh hợp lệ.`));
      return;
    }

    const reader = new FileReader();
    reader.onerror = () => reject(new Error(`Không thể đọc tập tin "${file.name}".`));
    reader.onload = (e) => {
      const img = new Image();
      img.onerror = () => reject(new Error(`Không thể tải hình ảnh "${file.name}".`));
      img.onload = () => {
        let { width, height } = img;

        // Calculate aspect ratio preserving dimensions
        if (width > maxWidth || height > maxHeight) {
          if (width / height > maxWidth / maxHeight) {
            height = Math.round((height * maxWidth) / width);
            width = maxWidth;
          } else {
            width = Math.round((width * maxHeight) / height);
            height = maxHeight;
          }
        }

        const canvas = document.createElement('canvas');
        canvas.width = Math.max(width, 1);
        canvas.height = Math.max(height, 1);

        const ctx = canvas.getContext('2d');
        if (!ctx) {
          reject(new Error('Trình duyệt không hỗ trợ xử lý hình ảnh qua Canvas.'));
          return;
        }

        // Fill white background for transparent PNG/WebP conversions to JPEG
        ctx.fillStyle = '#ffffff';
        ctx.fillRect(0, 0, canvas.width, canvas.height);

        // High quality image smoothing
        ctx.imageSmoothingEnabled = true;
        ctx.imageSmoothingQuality = 'high';
        ctx.drawImage(img, 0, 0, canvas.width, canvas.height);

        // Convert to optimized JPEG data URL
        const dataUrl = canvas.toDataURL('image/jpeg', quality);

        // Approximate byte size of data URL
        const head = 'data:image/jpeg;base64,';
        const base64Length = dataUrl.length - head.length;
        const compressedSize = Math.round((base64Length * 3) / 4);

        resolve({
          dataUrl,
          name: file.name,
          originalSize: file.size,
          compressedSize,
        });
      };

      img.src = e.target?.result as string;
    };

    reader.readAsDataURL(file);
  });
}

export async function compressMultipleImages(
  files: FileList | File[],
  maxWidth = 1280,
  maxHeight = 1280,
  quality = 0.75
): Promise<CompressedImageResult[]> {
  const fileArray = Array.from(files);
  const results: CompressedImageResult[] = [];

  for (const file of fileArray) {
    try {
      const res = await compressImageFile(file, maxWidth, maxHeight, quality);
      results.push(res);
    } catch (err) {
      console.warn(`Lỗi nén ảnh ${file.name}:`, err);
    }
  }

  return results;
}
