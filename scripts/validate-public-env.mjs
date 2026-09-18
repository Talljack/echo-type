const required = ['NEXT_PUBLIC_SUPABASE_URL', 'NEXT_PUBLIC_SUPABASE_ANON_KEY'];
const missing = required.filter((name) => !process.env[name]?.trim());

if (missing.length > 0) {
  console.error(`Missing public build configuration: ${missing.join(', ')}`);
  process.exit(1);
}

let supabaseUrl;
try {
  supabaseUrl = new URL(process.env.NEXT_PUBLIC_SUPABASE_URL);
} catch {
  console.error('NEXT_PUBLIC_SUPABASE_URL must be a valid URL.');
  process.exit(1);
}

if (supabaseUrl.protocol !== 'https:') {
  console.error('NEXT_PUBLIC_SUPABASE_URL must use HTTPS.');
  process.exit(1);
}

console.log('Public authentication configuration is present.');
