/**
 * Loads a picture and shrinks it to a JPEG data URL small enough for a thumbnail in the PDF.
 * Returns null when the picture cannot be loaded (offline, blocked by CORS, not a bitmap).
 */
export async function loadThumbnail(src: string, base: string): Promise<string | null> {
  try {
    const response = await fetch(new URL(src, base), { signal: AbortSignal.timeout(6000) });
    if (!response.ok) return null;
    const blob = await response.blob();
    if (!blob.type.startsWith('image/') || blob.type.includes('svg')) return null;
    const bitmap = await createImageBitmap(blob);
    try {
      const width = Math.min(480, bitmap.width);
      const height = Math.round((bitmap.height * width) / bitmap.width);
      const canvas = document.createElement('canvas');
      canvas.width = width;
      canvas.height = height;
      const context = canvas.getContext('2d');
      if (!context) return null;
      context.fillStyle = '#ffffff';
      context.fillRect(0, 0, width, height);
      context.drawImage(bitmap, 0, 0, width, height);
      return canvas.toDataURL('image/jpeg', 0.82);
    } finally {
      bitmap.close();
    }
  } catch {
    return null;
  }
}
