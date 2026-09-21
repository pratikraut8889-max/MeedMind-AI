const ALLOWED_MIME_TYPES = new Set([
  'application/pdf',
  'image/jpeg',
  'image/png',
  'image/webp',
  'audio/wav',
  'audio/mp3',
  'audio/webm',
  'audio/ogg'
]);

const MAX_BASE64_LENGTH = 15 * 1024 * 1024; // Approx 11MB file limit

export interface FileValidationResult {
  valid: boolean;
  error?: string;
  cleanBase64?: string;
  mimeType?: string;
}

export function validateBase64Upload(input: unknown, declaredMimeType?: unknown): FileValidationResult {
  if (typeof input !== 'string' || !input.trim()) {
    return { valid: false, error: 'No file data provided or invalid file string.' };
  }

  let raw = input.trim();
  let extractedMime = typeof declaredMimeType === 'string' ? declaredMimeType.toLowerCase().trim() : '';

  // Check if standard data URI scheme prefix is present: "data:image/jpeg;base64,..."
  if (raw.startsWith('data:')) {
    const commaIndex = raw.indexOf(',');
    if (commaIndex !== -1) {
      const header = raw.slice(5, commaIndex); // e.g. "image/jpeg;base64"
      const parts = header.split(';');
      if (!extractedMime && parts[0]) {
        extractedMime = parts[0].toLowerCase().trim();
      }
      raw = raw.slice(commaIndex + 1);
    }
  }

  // Verify length
  if (raw.length > MAX_BASE64_LENGTH) {
    return { valid: false, error: 'File size exceeds the 10MB limit. Please upload a smaller document or compressed image.' };
  }

  if (!extractedMime || !ALLOWED_MIME_TYPES.has(extractedMime)) {
    return {
      valid: false,
      error: `Unsupported file type (${extractedMime || 'unknown'}). Supported formats are PDF, JPEG, PNG, and WebP.`
    };
  }

  // Basic base64 character sanity check
  const base64Regex = /^[A-Za-z0-9+/=]+$/;
  // Sample first and last 200 characters for high-performance validation
  const sample = raw.slice(0, 200) + raw.slice(-200);
  if (!base64Regex.test(sample)) {
    return { valid: false, error: 'Invalid Base64 encoding in uploaded document.' };
  }

  return {
    valid: true,
    cleanBase64: raw,
    mimeType: extractedMime
  };
}
