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
  serverExternalPackages: ['pdf-parse', 'pdfjs-dist'],
};

export default nextConfig;
