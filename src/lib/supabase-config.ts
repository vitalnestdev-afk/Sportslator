// Publishable values — safe in client code by design. Env vars override.
export const SUPABASE_URL =
  process.env.NEXT_PUBLIC_SUPABASE_URL ?? "https://mykjawluljhnjphnykym.supabase.co";
export const SUPABASE_ANON_KEY =
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY ??
  "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Im15a2phd2x1bGpobmpwaG55a3ltIiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODEyNTg5NDMsImV4cCI6MjA5NjgzNDk0M30.4IHoec6jPptufRmskQepnLNaA5nNmghrgmHkOSC3Gpw";
