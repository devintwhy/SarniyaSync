"use client";

import { useEffect, useState } from "react";
import { createSupabaseBrowserClient } from "@/utils/supabase/client";
import { normalizeAppRole } from "@/utils/supabase/auth";

export type HeaderUser = {
  name?: string | null;
  role?: string | null;
  email?: string | null;
};

export type HeaderProps = {
  title?: string;
  user?: HeaderUser | null;
};

export default function Header({
  title = "SarniyaSync - Sistem Manajemen Inventaris Terpadu",
  user: initialUser,
}: HeaderProps) {
  const [userData, setUserData] = useState<HeaderUser | null>(initialUser ?? null);
  const [isLoading, setIsLoading] = useState<boolean>(!initialUser);

  useEffect(() => {
    if (initialUser && (initialUser.name || initialUser.role)) {
      setUserData(initialUser);
      setIsLoading(false);
      return;
    }

    let isMounted = true;

    async function loadUserProfile() {
      try {
        const supabase = createSupabaseBrowserClient();
        const {
          data: { user },
        } = await supabase.auth.getUser();

        if (!user) {
          if (isMounted) {
            setUserData({ name: "Pengguna", role: "Tamu" });
            setIsLoading(false);
          }
          return;
        }

        const { data: profile } = await supabase
          .from("profiles")
          .select("full_name, role")
          .eq("id", user.id)
          .maybeSingle();

        if (!isMounted) return;

        const roleNormalized = normalizeAppRole(profile?.role);
        const displayRole =
          roleNormalized === "mitra"
            ? "Mitra"
            : roleNormalized === "pemilik"
            ? "Pemilik"
            : roleNormalized === "admin"
            ? "Admin"
            : "Pengguna";

        const displayName =
          profile?.full_name?.trim() ||
          user.user_metadata?.full_name?.trim() ||
          user.email?.split("@")[0] ||
          "Pengguna";

        setUserData({
          name: displayName,
          role: displayRole,
          email: user.email,
        });
      } catch {
        if (isMounted) {
          setUserData({ name: "Pengguna", role: "Staf" });
        }
      } finally {
        if (isMounted) {
          setIsLoading(false);
        }
      }
    }

    void loadUserProfile();

    return () => {
      isMounted = false;
    };
  }, [initialUser]);

  const displayName = userData?.name?.trim() || "Pengguna";
  const displayRole = userData?.role?.trim() || "Pengguna";
  const initial = (displayName.charAt(0) || "U").toUpperCase();

  return (
    <header className="sticky top-0 z-20 flex h-16 w-full items-center justify-between border-b border-gray-200 bg-white px-6 py-3">
      <div className="flex items-center gap-3 min-w-0 pr-4">
        <span className="text-sm font-semibold text-gray-700 truncate">
          {title}
        </span>
      </div>

      <div className="flex items-center gap-4 shrink-0">
        <div className="flex items-center gap-3">
          {isLoading ? (
            <div className="flex items-center gap-3">
              <div className="h-9 w-9 rounded-full bg-gray-200 animate-pulse shrink-0" />
              <div className="flex flex-col gap-1.5">
                <div className="h-3.5 w-20 bg-gray-200 rounded animate-pulse" />
                <div className="h-2.5 w-12 bg-gray-200 rounded animate-pulse" />
              </div>
            </div>
          ) : (
            <>
              <div
                className="flex h-9 w-9 shrink-0 select-none items-center justify-center rounded-full bg-[#9D5C4C] text-sm font-bold text-white uppercase shadow-sm"
                aria-hidden="true"
              >
                {initial}
              </div>

              <div className="flex flex-col text-left leading-tight">
                <span
                  className="max-w-[130px] sm:max-w-[200px] truncate text-sm font-semibold text-gray-800"
                  title={displayName}
                >
                  {displayName}
                </span>
                <span className="text-xs text-gray-500">
                  {displayRole}
                </span>
              </div>
            </>
          )}
        </div>
      </div>
    </header>
  );
}
