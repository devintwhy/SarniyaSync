import { createServerClient, type CookieOptions } from "@supabase/ssr";
import { NextResponse, type NextRequest } from "next/server";
import type { Database } from "@/utils/supabase/database.types";
import { getProfileRole, type AppRole } from "@/utils/supabase/auth";

const adminRoutePrefixes = [
  "/dashboard",
  "/alokasi",
  "/penjualan",
  "/mitra",
  "/inventory",
  "/produk",
  "/api/products",
  "/api/admin",
];

/**
 * Hilangkan maxAge dan expires dari opsi cookie agar cookie menjadi
 * session cookie murni — terhapus otomatis saat browser ditutup.
 * Penting: panggil ini pada SETIAP cookie yang di-set oleh middleware
 * agar proses token-refresh tidak "mengembalikan" persistensi.
 */
function asSessionCookie(options: CookieOptions): CookieOptions {
  const { maxAge: _maxAge, expires: _expires, ...rest } = options;
  return {
    ...rest,
    sameSite: rest.sameSite ?? "lax",
    secure: process.env.NODE_ENV === "production",
    path: rest.path ?? "/",
    // maxAge & expires sengaja tidak di-set → menjadi session cookie
  };
}

function copyCookies(source: NextResponse, destination: NextResponse) {
  source.cookies.getAll().forEach((cookie) => destination.cookies.set(cookie));
  return destination;
}

export async function middleware(request: NextRequest) {
  const { pathname, search } = request.nextUrl;
  const isApiRoute = pathname.startsWith("/api/");

  if (pathname.startsWith("/login")) return NextResponse.next();

  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
  if (!supabaseUrl || !supabaseAnonKey) {
    return isApiRoute
      ? NextResponse.json({ error: "Konfigurasi Supabase belum tersedia." }, { status: 500 })
      : NextResponse.redirect(new URL("/login", request.url));
  }

  let response = NextResponse.next({ request });
  const supabase = createServerClient<Database>(supabaseUrl, supabaseAnonKey, {
    cookies: {
      getAll() {
        return request.cookies.getAll();
      },
      setAll(cookiesToSet) {
        // Strip maxAge/expires agar refresh token tidak membuat cookie
        // kembali persisten setelah proses rotasi token oleh middleware.
        cookiesToSet.forEach(({ name, value }) => request.cookies.set(name, value));
        response = NextResponse.next({ request });
        cookiesToSet.forEach(({ name, value, options }) =>
          response.cookies.set(name, value, asSessionCookie(options)),
        );
      },
    },
  });

  const { data: { user }, error: authError } = await supabase.auth.getUser();
  if (authError || !user) {
    if (isApiRoute) {
      return copyCookies(response, NextResponse.json({ error: "Sesi login diperlukan." }, { status: 401 }));
    }

    const loginUrl = new URL("/login", request.url);
    loginUrl.searchParams.set("next", `${pathname}${search}`);
    return copyCookies(response, NextResponse.redirect(loginUrl));
  }

  let role: AppRole | null;
  try {
    role = await getProfileRole(supabase, user.id);
  } catch (error) {
    console.error("Unable to verify the user's profile role:", error);
    return isApiRoute
      ? copyCookies(response, NextResponse.json({ error: "Role pengguna tidak dapat diverifikasi." }, { status: 403 }))
      : new NextResponse("Role pengguna tidak dapat diverifikasi. Periksa profil dan policy RLS.", { status: 403 });
  }

  if (!role) {
    return isApiRoute
      ? copyCookies(response, NextResponse.json({ error: "Role pengguna belum terdaftar." }, { status: 403 }))
      : new NextResponse("Role pengguna belum terdaftar di tabel profiles.", { status: 403 });
  }

  const isPartnerRoute = pathname.startsWith("/partner");
  const isLegacyPartnerRoute = pathname.startsWith("/store") || pathname.startsWith("/api/partner");
  const isAdminRoute = pathname === "/" || adminRoutePrefixes.some((prefix) => pathname.startsWith(prefix));

  if (role === "mitra") {
    if (isPartnerRoute) return response;
    if (pathname.startsWith("/dashboard")) {
      return copyCookies(response, NextResponse.redirect(new URL("/partner", request.url)));
    }
    if (isLegacyPartnerRoute) return response;
    if (isApiRoute) {
      return copyCookies(response, NextResponse.json({ error: "Rute ini tidak tersedia untuk role Mitra." }, { status: 403 }));
    }
    return copyCookies(response, NextResponse.redirect(new URL("/partner", request.url)));
  }

  if (isPartnerRoute || isLegacyPartnerRoute) {
    if (isApiRoute) {
      return copyCookies(response, NextResponse.json({ error: "Rute ini khusus untuk role Mitra." }, { status: 403 }));
    }
    return copyCookies(response, NextResponse.redirect(new URL("/dashboard", request.url)));
  }

  if (pathname.startsWith("/dashboard")) {
    return copyCookies(response, NextResponse.rewrite(new URL("/", request.url)));
  }

  if (isAdminRoute) return response;
  if (isApiRoute) {
    return copyCookies(response, NextResponse.json({ error: "Rute API tidak tersedia untuk role ini." }, { status: 403 }));
  }

  return response;
}

export const config = {
  matcher: ["/((?!_next/static|_next/image|favicon.ico|robots.txt|sitemap.xml|.*\\.(?:svg|png|jpg|jpeg|gif|webp|ico)$).*)"],
};