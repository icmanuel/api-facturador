import { BadRequestException } from '@nestjs/common';

const IMAGE_MIMES = ['image/png', 'image/jpeg', 'image/jpg'];
const IMAGE_EXTS = ['.png', '.jpg', '.jpeg'];

/**
 * Whether an uploaded file is an accepted image (PNG/JPG).
 *
 * Some HTTP clients send the multipart part without a proper Content-Type
 * (e.g. `application/octet-stream`), so we also accept based on the file
 * extension as a fallback.
 */
export function isAllowedImage(file: { mimetype?: string; originalname?: string }): boolean {
  const mime = (file.mimetype || '').toLowerCase();
  if (IMAGE_MIMES.includes(mime)) return true;
  const name = (file.originalname || '').toLowerCase();
  return IMAGE_EXTS.some((ext) => name.endsWith(ext));
}

/** Multer fileFilter that accepts only PNG/JPG (by mime or extension). */
export const imageFileFilter = (
  _req: unknown,
  file: { mimetype?: string; originalname?: string },
  cb: (error: Error | null, acceptFile: boolean) => void,
): void => {
  if (isAllowedImage(file)) {
    cb(null, true);
  } else {
    cb(new BadRequestException('Solo se permiten imágenes PNG o JPG'), false);
  }
};

/**
 * Normalize the effective image mime type to either 'image/png' or 'image/jpeg',
 * falling back to the file extension when the reported mime type is generic.
 */
export function resolveImageMime(file: { mimetype?: string; originalname?: string }): string {
  const mime = (file.mimetype || '').toLowerCase();
  if (mime === 'image/png') return 'image/png';
  if (mime === 'image/jpeg' || mime === 'image/jpg') return 'image/jpeg';
  const name = (file.originalname || '').toLowerCase();
  return name.endsWith('.png') ? 'image/png' : 'image/jpeg';
}
