import type { NextConfig } from 'next';

const isTauri = process.env.TAURI_ENV === '1';

const tauriTracingExcludes: NonNullable<NextConfig['outputFileTracingExcludes']> = {
  '/*': [
    '.git/**/*',
    '.github/**/*',
    '.omc/**/*',
    'docs/**/*',
    'design-system/**/*',
    'e2e/**/*',
    'test-results/**/*',
    'tests/**/*',
    'src-tauri/**/*',
    'src-tauri/resources/**/*',
    'src-tauri/target/**/*',
  ],
};

const nextConfig: NextConfig = {
  output: isTauri ? 'standalone' : undefined,
  outputFileTracingExcludes: isTauri ? tauriTracingExcludes : undefined,
  // `src/proxy.ts` runs before import routes. Keep its buffered request body
  // comfortably above the largest accepted 25 MiB media upload plus multipart overhead.
  experimental: {
    proxyClientMaxBodySize: 26 * 1024 * 1024,
  },
  serverExternalPackages: ['@napi-rs/canvas', 'pdf-parse', 'pdfjs-dist'],
};

export default nextConfig;
