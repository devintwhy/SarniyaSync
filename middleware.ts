import { createServerClient, type CookieOptions } from "@supabase/ssr";
import { NextResponse, type NextRequest } from "next/server";
import type { Database } from "@/utils/supabase/database.types";
import { getProfileRole, type AppRole } from "@/utils/supabase/auth";

const adminRoutePrefixes = [
  "/dashboard",
  "/alokasi",
  "/penjualan",
  "/manajemen-mitra",
  "/mitra",
  "/inventory",
  "/produk",
  "/pengiriman",
  "/laporan-penyesuaian",
  "/riwayat-admin",
  "/profil-admin",
  "/api/products",
  "/api/admin",
];

const partnerRoutePrefixes = [
  "/dashboard-mitra",
  "/kasir",
  "/katalog",
  "/stok",
  "/penyesuaian-stok",
  "/stock-opname",
  "/penerimaan",
  "/transaksi",
  "/riwayat-mitra",
  "/profil-mitra",
  "/status",
  "/store",
  "/api/partner",
];

function asSessionCookie(options: CookieOptions): CookieOptions {
  const { maxAge: _maxAge, expires: _expires, ...rest } = options;
  return {
    ...rest,
    sameSite: rest.sameSite ?? "lax",
    secure: process.env.NODE_ENV === "production",
    path: rest.path ?? "/",
  };
}

function copyCookies(source: NextResponse, destination: NextResponse) {
  source.cookies.getAll().forEach((cookie) => destination.cookies.set(cookie));
  return destination;
}

export async function middleware(request: NextRequest) {
  const { pathname, search } = request.nextUrl;
  const isApiRoute = pathname.startsWith("/api/");

  // Middleware Autentikasi dan Pembatasan Role
  if (pathname.startsWith("/login") || pathname.startsWith("/register")) {
    return NextResponse.next();
  }

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
    if (pathname !== "/") {
      loginUrl.searchParams.set("next", `${pathname}${search}`);
    }
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

  // Pengalihan Rute Lama Mitra ke Rute Utama
  if (pathname === "/partner" || pathname === "/partner/" || pathname === "/mitra" || pathname === "/mitra/") {
    if (role === "admin" || role === "pemilik") {
      return copyCookies(response, NextResponse.redirect(new URL("/manajemen-mitra", request.url)));
    }
    return copyCookies(response, NextResponse.redirect(new URL("/dashboard-mitra", request.url)));
  }
  if (pathname === "/partner/kasir" || pathname.startsWith("/partner/kasir/") || pathname === "/mitra/kasir" || pathname.startsWith("/mitra/kasir/")) {
    return copyCookies(response, NextResponse.redirect(new URL("/kasir", request.url)));
  }
  if (pathname === "/partner/katalog" || pathname.startsWith("/partner/katalog/") || pathname === "/mitra/katalog" || pathname.startsWith("/mitra/katalog/")) {
    return copyCookies(response, NextResponse.redirect(new URL("/katalog", request.url)));
  }
  if (pathname === "/partner/stok" || pathname.startsWith("/partner/stok/") || pathname === "/mitra/stok" || pathname.startsWith("/mitra/stok/")) {
    return copyCookies(response, NextResponse.redirect(new URL("/stok", request.url)));
  }
  if (pathname === "/partner/stock-opname" || pathname.startsWith("/partner/stock-opname/") || pathname === "/partner/penyesuaian-stok" || pathname.startsWith("/partner/penyesuaian-stok/") || pathname === "/mitra/penyesuaian-stok" || pathname.startsWith("/mitra/penyesuaian-stok/")) {
    return copyCookies(response, NextResponse.redirect(new URL("/penyesuaian-stok", request.url)));
  }
  if (pathname === "/stock-opname" || pathname.startsWith("/stock-opname/")) {
    return copyCookies(response, NextResponse.redirect(new URL("/penyesuaian-stok", request.url)));
  }
  if (pathname === "/partner/penerimaan" || pathname.startsWith("/partner/penerimaan/") || pathname === "/mitra/penerimaan" || pathname.startsWith("/mitra/penerimaan/")) {
    return copyCookies(response, NextResponse.redirect(new URL("/penerimaan", request.url)));
  }
  if (pathname === "/partner/transaksi" || pathname.startsWith("/partner/transaksi/") || pathname === "/mitra/transaksi" || pathname.startsWith("/mitra/transaksi/")) {
    return copyCookies(response, NextResponse.redirect(new URL("/transaksi", request.url)));
  }
  if (pathname === "/partner/profil" || pathname.startsWith("/partner/profil/") || pathname === "/mitra/profil" || pathname.startsWith("/mitra/profil/")) {
    return copyCookies(response, NextResponse.redirect(new URL("/profil-mitra", request.url)));
  }
  if (pathname === "/partner/status" || pathname.startsWith("/partner/status/") || pathname === "/mitra/status" || pathname.startsWith("/mitra/status/")) {
    return copyCookies(response, NextResponse.redirect(new URL("/status", request.url)));
  }

  // Pengalihan Rute Lama Admin ke Rute Utama
  if (pathname === "/admin/mitra" || pathname.startsWith("/admin/mitra/") || pathname === "/admin/manajemen-mitra" || pathname.startsWith("/admin/manajemen-mitra/")) {
    return copyCookies(response, NextResponse.redirect(new URL("/manajemen-mitra", request.url)));
  }
  if (pathname === "/admin" || pathname === "/admin/") {
    return copyCookies(response, NextResponse.redirect(new URL("/dashboard", request.url)));
  }
  if (pathname.startsWith("/admin/")) {
    const subPath = pathname.replace(/^\/admin/, "");
    const targetPath = subPath === "/mitra" ? "/manajemen-mitra" : (subPath || "/dashboard");
    return copyCookies(response, NextResponse.redirect(new URL(targetPath, request.url)));
  }

  const isPartnerTarget = partnerRoutePrefixes.some((prefix) => pathname.startsWith(prefix));
  const isAdminTarget = pathname === "/" || adminRoutePrefixes.some((prefix) => pathname.startsWith(prefix));

  if (role === "mitra") {
    if (pathname === "/dashboard" || pathname.startsWith("/dashboard/")) {
      return copyCookies(response, NextResponse.redirect(new URL("/dashboard-mitra", request.url)));
    }
    if (pathname === "/profil" || pathname === "/profil/") {
      return copyCookies(response, NextResponse.redirect(new URL("/profil-mitra", request.url)));
    }
    if (pathname === "/riwayat" || pathname.startsWith("/riwayat/")) {
      return copyCookies(response, NextResponse.redirect(new URL("/transaksi", request.url)));
    }
    if (pathname === "/") {
      return copyCookies(response, NextResponse.redirect(new URL("/dashboard-mitra", request.url)));
    }

    if (isPartnerTarget) return response;

    if (isAdminTarget) {
      if (isApiRoute) {
        return copyCookies(response, NextResponse.json({ error: "Rute ini khusus untuk Administrator." }, { status: 403 }));
      }
      return copyCookies(response, NextResponse.redirect(new URL("/dashboard-mitra", request.url)));
    }

    return response;
  }

  // Pengaturan Akses Admin dan Pemilik
  if (pathname === "/") {
    return copyCookies(response, NextResponse.redirect(new URL("/dashboard", request.url)));
  }
  if (pathname === "/profil" || pathname === "/profil/") {
    return copyCookies(response, NextResponse.redirect(new URL("/profil-admin", request.url)));
  }
  if (pathname === "/katalog" || pathname.startsWith("/katalog/")) {
    return copyCookies(response, NextResponse.redirect(new URL("/produk", request.url)));
  }

  if (isPartnerTarget) {
    if (isApiRoute) {
      return copyCookies(response, NextResponse.json({ error: "Rute ini khusus untuk role Mitra." }, { status: 403 }));
    }
    return copyCookies(response, NextResponse.redirect(new URL("/dashboard", request.url)));
  }

  if (isAdminTarget) return response;

  if (isApiRoute) {
    return copyCookies(response, NextResponse.json({ error: "Rute API tidak tersedia." }, { status: 404 }));
  }

  return response;
}

export const config = {
  matcher: ["/((?!_next/static|_next/image|favicon.ico|robots.txt|sitemap.xml|.*\\.(?:svg|png|jpg|jpeg|gif|webp|ico)$).*)"],
};
