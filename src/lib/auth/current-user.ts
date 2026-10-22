import { createServerSupabase } from '@/lib/supabase/server';
import type { Usuario } from '@/types/database';

/**
 * Obtiene el usuario autenticado + su perfil extendido.
 * Devuelve null si no hay sesión O si el usuario está marcado inactivo.
 *
 * Importante: no devolvemos un objeto con `activo=false`; o es un usuario
 * utilizable, o es null. Así todo el código consumidor trata "inactivo"
 * como "no autorizado" sin lógica extra.
 */
export async function getCurrentUser(): Promise<{
  authId: string;
  perfil: Usuario;
} | null> {
  const supabase = createServerSupabase();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return null;

  const { data: perfil, error } = await supabase
    .from('usuarios')
    .select('*')
    .eq('id', user.id)
    .single();

  if (error || !perfil) return null;
  if (!(perfil as Usuario).activo) return null;
  return { authId: user.id, perfil: perfil as Usuario };
}

/** Devuelve el usuario autenticado O lanza error específico de bloqueo. */
export async function requireAuth() {
  const u = await getCurrentUser();
  if (!u) throw new Error('No autenticado o usuario inactivo');
  return u;
}

/** Guard para rutas / server actions que requieren rol gerente activo. */
export async function requireGerente() {
  const u = await requireAuth();
  if (u.perfil.rol !== 'gerente') {
    throw new Error('Operación reservada al gerente');
  }
  return u;
}

/**
 * Para distinguir "no sesión" vs "sesión pero inactivo", útil al redirigir
 * desde el layout con un mensaje al usuario.
 */
export async function getSessionStatus(): Promise<
  | { kind: 'anon' }
  | { kind: 'inactivo' }
  | { kind: 'ok'; perfil: Usuario }
> {
  const supabase = createServerSupabase();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { kind: 'anon' };
  const { data: perfil } = await supabase
    .from('usuarios')
    .select('*')
    .eq('id', user.id)
    .single();
  if (!perfil) return { kind: 'anon' };
  const p = perfil as Usuario;
  if (!p.activo) return { kind: 'inactivo' };
  return { kind: 'ok', perfil: p };
}
