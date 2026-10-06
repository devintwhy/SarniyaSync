import { createServerClient, type CookieOptions } from "@supabase/ssr";
import { cookies } from "next/headers";
import type { Database } from "@/utils/supabase/database.types";

/** Strip maxAge & expires → session cookie murni (terhapus saat browser ditutup). */
function asSessionCookie(options: CookieOptions): CookieOptions {
  const { maxAge: _maxAge, expires: _expires, ...rest } = options;
  return {
    ...rest,
    sameSite: rest.sameSite ?? "lax",
    secure: process.env.NODE_ENV === "production",
    path: rest.path ?? "/",
  };
}

export async function createSupabaseServerClient() {
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

  if (!supabaseUrl || !supabaseAnonKey) {
    throw new Error("Supabase environment variables are not configured.");
  }

  const cookieStore = cookies();

  return createServerClient<Database>(supabaseUrl, supabaseAnonKey, {
    cookies: {
      getAll() {
        return cookieStore.getAll();
      },
      setAll(cookiesToSet) {
        try {
          cookiesToSet.forEach(({ name, value, options }) => {
            cookieStore.set(name, value, asSessionCookie(options));
          });
        } catch {
          // Middleware refreshes auth cookies when server components cannot write them.
        }
      },
    },
  });
}