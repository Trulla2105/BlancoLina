import { createServerClient, type CookieOptions } from "@supabase/ssr";
import { NextResponse, type NextRequest } from "next/server";

import { getSupabaseEnv } from "./env";

type CookieToSet = { name: string; value: string; options: CookieOptions };

/**
 * Refresca la sesión y exige usuario logueado en /admin.
 * El chequeo de rol admin (tabla admin_users) lo hace app/admin/(panel)/layout.tsx;
 * acá solo se corta el paso a anónimos.
 */
export async function updateSession(request: NextRequest) {
  const env = getSupabaseEnv();
  if (!env) return NextResponse.next({ request });

  let supabaseResponse = NextResponse.next({ request });

  const supabase = createServerClient(env.url, env.anonKey, {
    cookies: {
      getAll() {
        return request.cookies.getAll();
      },
      setAll(cookiesToSet: CookieToSet[]) {
        cookiesToSet.forEach(({ name, value }) => request.cookies.set(name, value));
        supabaseResponse = NextResponse.next({ request });
        cookiesToSet.forEach(({ name, value, options }) =>
          supabaseResponse.cookies.set(name, value, options)
        );
      },
    },
  });

  const {
    data: { user },
  } = await supabase.auth.getUser();

  const { pathname } = request.nextUrl;
  const isAdminPath = pathname.startsWith("/admin") && pathname !== "/admin/ingresar";

  if (!user && isAdminPath) {
    const url = request.nextUrl.clone();
    url.pathname = "/admin/ingresar";
    return NextResponse.redirect(url);
  }

  return supabaseResponse;
}
