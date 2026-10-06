import { createBrowserClient } from "@supabase/ssr";
import type { Database } from "@/utils/supabase/database.types";

/**
 * Buat Supabase browser client dengan cookie sebagai SESSION COOKIE murni.
 *
 * Secara default @supabase/ssr menyimpan cookie dengan Max-Age ~400 hari
 * (persisten lintas sesi browser). Untuk perangkat kasir yang dipakai bersama,
 * kita strip `maxAge` dan `expires` dari setiap cookie sehingga browser
 * menghapusnya otomatis saat semua jendela ditutup.
 *
 * Catatan penting: Refresh token Supabase di server (Dashboard → Auth → Config)
 * tetap perlu dikonfigurasi (misal 8 jam), karena validitas token dikontrol
 * server — bukan semata-mata oleh maxAge cookie di browser.
 */
export function createSupabaseBrowserClient() {
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

  if (!supabaseUrl || !supabaseAnonKey) {
    throw new Error("Supabase environment variables are not configured.");
  }

  return createBrowserClient<Database>(supabaseUrl, supabaseAnonKey, {
    cookieOptions: {
      // Hapus maxAge & expires → menjadi session cookie (hilang saat browser ditutup)
      // sameSite: "lax" tetap aman untuk aplikasi web standar
      // secure: true wajib di production (HTTPS)
      sameSite: "lax" as const,
      secure: process.env.NODE_ENV === "production",
      path: "/",
      // Jangan set maxAge atau expires di sini!
    },
  });
}