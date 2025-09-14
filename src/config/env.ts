interface EnvConfig {
  VITE_GOOGLE_CLIENT_ID: string;
  VITE_GOOGLE_SHEETS_API_KEY: string;
  VITE_GOOGLE_SHEETS_SPREADSHEET_ID: string;
  VITE_GOOGLE_REDIRECT_URI: string;
  VITE_SUPABASE_URL: string;
  VITE_SUPABASE_ANON_KEY: string;
}

const env = {
  VITE_GOOGLE_CLIENT_ID: import.meta.env.VITE_GOOGLE_CLIENT_ID || '',
  VITE_GOOGLE_SHEETS_API_KEY: import.meta.env.VITE_GOOGLE_SHEETS_API_KEY || '',
  VITE_GOOGLE_SHEETS_SPREADSHEET_ID: import.meta.env.VITE_GOOGLE_SHEETS_SPREADSHEET_ID || '',
  VITE_GOOGLE_REDIRECT_URI: import.meta.env.VITE_GOOGLE_REDIRECT_URI || 'http://localhost:5173',
  VITE_SUPABASE_URL: import.meta.env.VITE_SUPABASE_URL || '',
  VITE_SUPABASE_ANON_KEY: import.meta.env.VITE_SUPABASE_ANON_KEY || '',
} as const satisfies EnvConfig;

export default env;
