// AES-GCM encryption for localStorage data
// Uses Web Crypto API with a device-specific key stored separately

const KEY_STORAGE = 'echotype_dk';
const ALGO = 'AES-GCM';
const IV_LENGTH = 12;

async function getOrCreateKey(): Promise<CryptoKey> {
  if (typeof window === 'undefined') throw new Error('No window');

  const stored = localStorage.getItem(KEY_STORAGE);
  if (stored) {
    const raw = Uint8Array.from(atob(stored), (c) => c.charCodeAt(0));
    return crypto.subtle.importKey('raw', raw, ALGO, false, ['encrypt', 'decrypt']);
  }

  const key = await crypto.subtle.generateKey({ name: ALGO, length: 256 }, true, ['encrypt', 'decrypt']);
  const exported = await crypto.subtle.exportKey('raw', key);
  localStorage.setItem(KEY_STORAGE, btoa(String.fromCharCode(...new Uint8Array(exported))));
  return key;
}

export async function encrypt(data: string): Promise<string> {
  const key = await getOrCreateKey();
  const iv = crypto.getRandomValues(new Uint8Array(IV_LENGTH));
  const encoded = new TextEncoder().encode(data);
  const ciphertext = await crypto.subtle.encrypt({ name: ALGO, iv }, key, encoded);

  // Combine IV + ciphertext and encode as base64
  const combined = new Uint8Array(IV_LENGTH + ciphertext.byteLength);
  combined.set(iv);
  combined.set(new Uint8Array(ciphertext), IV_LENGTH);
  return btoa(String.fromCharCode(...combined));
}

export async function decrypt(encoded: string): Promise<string> {
  const key = await getOrCreateKey();
  const combined = Uint8Array.from(atob(encoded), (c) => c.charCodeAt(0));
  const iv = combined.slice(0, IV_LENGTH);
  const ciphertext = combined.slice(IV_LENGTH);

  const decrypted = await crypto.subtle.decrypt({ name: ALGO, iv }, key, ciphertext);
  return new TextDecoder().decode(decrypted);
}

/**
 * Try to decrypt data. If it fails (e.g. data is unencrypted JSON from before migration),
 * return the raw string so we can migrate it.
 */
export async function decryptOrRaw(encoded: string): Promise<{ data: string; wasEncrypted: boolean }> {
  try {
    const data = await decrypt(encoded);
    return { data, wasEncrypted: true };
  } catch {
    // Likely plain JSON from before encryption was added
    return { data: encoded, wasEncrypted: false };
  }
}
