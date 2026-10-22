import { createServerClient, type CookieOptions } from '@supabase/ssr';
import { NextResponse, type NextRequest } from 'next/server';

/**
 * Middleware helper: refresca la sesión de Supabase y adjunta las
 * cookies actualizadas a la respuesta. Llamado desde /middleware.ts.
 *
 * Además de la verificación de sesión, consulta `public.usuarios.activo`
 * y expulsa a cualquier usuario desactivado (aunque conserve cookies
 * válidas de Supabase Auth).
 */
export async function updateSession(request: NextRequest) {
  let supabaseResponse = NextResponse.next({ request });

  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        get(name: string) {
          return request.cookies.get(name)?.value;
        },
        set(name: string, value: string, options: CookieOptions) {
          request.cookies.set({ name, value, ...options });
          supabaseResponse = NextResponse.next({ request });
          supabaseResponse.cookies.set({ name, value, ...options });
        },
        remove(name: string, options: CookieOptions) {
          request.cookies.set({ name, value: '', ...options });
          supabaseResponse = NextResponse.next({ request });
          supabaseResponse.cookies.set({ name, value: '', ...options });
        },
      },
    },
  );

  const {
    data: { user },
  } = await supabase.auth.getUser();

  const path = request.nextUrl.pathname;
  const isAuthRoute = path.startsWith('/login');
  const isPublic = isAuthRoute || path.startsWith('/_next') || path === '/favicon.ico';

  if (!user && !isPublic) {
    const url = request.nextUrl.clone();
    url.pathname = '/login';
    url.searchParams.set('next', path);
    return NextResponse.redirect(url);
  }

  // Si hay sesión, bloquea acceso cuando el perfil está marcado inactivo.
  // No se consulta en rutas públicas para evitar un roundtrip innecesario.
  if (user && !isPublic) {
    const { data: perfil } = await supabase
      .from('usuarios')
      .select('activo')
      .eq('id', user.id)
      .maybeSingle();

    if (!perfil || perfil.activo === false) {
      await supabase.auth.signOut();
      const url = request.nextUrl.clone();
      url.pathname = '/login';
      url.searchParams.set('motivo', 'inactivo');
      return NextResponse.redirect(url);
    }
  }

  if (user && isAuthRoute && path !== '/login') {
    const url = request.nextUrl.clone();
    url.pathname = '/dashboard';
    return NextResponse.redirect(url);
  }

  return supabaseResponse;
}
