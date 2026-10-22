/**
 * Supabase client para el servidor (Server Components, Route Handlers,
 * Server Actions). Lee cookies de la sesión del usuario autenticado.
 *
 * Si necesitas poder de admin (importación masiva, etc.), usa
 * `createServerAdminClient()` — eso lee SUPABASE_SERVICE_ROLE_KEY,
 * que SOLO existe en el servidor.
 */
import { createServerClient, type CookieOptions } from '@supabase/ssr';
import { createClient } from '@supabase/supabase-js';
import { cookies } from 'next/headers';

export function createServerSupabase() {
  const cookieStore = cookies();
  return createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        get(name: string) {
          return cookieStore.get(name)?.value;
        },
        set(name: string, value: string, options: CookieOptions) {
          try {
            cookieStore.set({ name, value, ...options });
          } catch {
            // Route Handlers no permiten set; ok silencioso en SC
          }
        },
        remove(name: string, options: CookieOptions) {
          try {
            cookieStore.set({ name, value: '', ...options });
          } catch {
            // idem
          }
        },
      },
    },
  );
}

/**
 * Cliente con service_role — para tareas administrativas en el servidor
 * (ej. seed, importación masiva donde queremos bypasear RLS controladamente).
 * JAMÁS importar en código del cliente.
 */
export function createServerAdminClient() {
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!key) {
    throw new Error(
      'SUPABASE_SERVICE_ROLE_KEY no está configurada. Agrégala a .env.local (nunca al navegador).',
    );
  }
  return createClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, key, {
    auth: { persistSession: false, autoRefreshToken: false },
  });
}
