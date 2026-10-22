/**
 * Supabase client para el navegador (componentes "use client").
 * Usa SOLO la anon key: nunca importes service_role en este archivo.
 */
import { createBrowserClient } from '@supabase/ssr';

export function createClient() {
  return createBrowserClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
  );
}
