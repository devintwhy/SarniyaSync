"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import { createSupabaseBrowserClient } from "@/utils/supabase/client";
import { AppRole, getProfileRole } from "@/utils/supabase/auth";

type NavigationItem = { label: string; href: string };

export default function SidebarNavigation() {
  const pathname = usePathname();
  const router = useRouter();
  const [role, setRole] = useState<AppRole | null>(null);
  const [navigationItems, setNavigationItems] = useState<NavigationItem[]>([]);
  const [isLoggingOut, setIsLoggingOut] = useState(false);

  useEffect(() => {
    if (
      pathname === "/login" ||
      pathname === "/partner" || pathname.startsWith("/partner/") ||
      pathname === "/dashboard" || pathname.startsWith("/dashboard/") ||
      pathname === "/store" || pathname.startsWith("/store/")
    ) return;
    let isActive = true;

    async function loadNavigation() {
      try {
        const supabase = createSupabaseBrowserClient();
        const { data: { user } } = await supabase.auth.getUser();
        if (!user) {
          router.replace("/login");
          return;
        }

        const userRole = await getProfileRole(supabase, user.id);
        if (!userRole) {
          router.replace("/login?error=profile");
          return;
        }

        if (!isActive) return;
        setRole(userRole);

        if (userRole === "mitra") {
          const { data: stores } = await supabase
            .from("partner_stores")
            .select("id, name")
            .eq("owner_id", user.id)
            .order("name", { ascending: true });
          if (!isActive) return;

          const storeItems = (stores ?? []).map((store) => ({
            label: (stores ?? []).length === 1 ? "Laporan Penjualan Toko Saya" : `Laporan ${store.name}`,
            href: `/store/${store.id}`,
          }));
          setNavigationItems([
            { label: "Dashboard Mitra", href: "/dashboard" },
            ...storeItems,
          ]);
          return;
        }

        setNavigationItems([
          { label: "Dashboard Utama", href: "/" },
          { label: "Kelola Stok Keseluruhan", href: "/inventory" },
          { label: "Alokasi Stok", href: "/alokasi" },
          { label: "Manajemen Mitra", href: "/mitra" },
          { label: "Laporan Penjualan", href: "/penjualan" },
        ]);
      } catch {
        if (isActive) router.replace("/login?error=profile");
      }
    }

    void loadNavigation();
    return () => {
      isActive = false;
    };
  }, [pathname, router]);

  async function handleLogout() {
    setIsLoggingOut(true);
    const supabase = createSupabaseBrowserClient();
    const { error } = await supabase.auth.signOut();
    if (error) {
      setIsLoggingOut(false);
      return;
    }
    router.replace("/login");
    router.refresh();
  }

  if (
    pathname === "/login" ||
    pathname === "/partner" || pathname.startsWith("/partner/") ||
    pathname === "/dashboard" || pathname.startsWith("/dashboard/") ||
    pathname === "/store" || pathname.startsWith("/store/")
  ) return null;

  return (
    <aside className="flex w-full flex-col bg-[#173b32] text-white lg:min-h-screen lg:w-64 lg:shrink-0">
      <div className="flex items-center gap-3 px-6 py-5 lg:py-8">
        <div className="flex size-10 items-center justify-center rounded-lg bg-[#d9f27e] text-lg font-bold text-[#173b32]">
          S
        </div>
        <div>
          <p className="text-lg font-semibold tracking-tight">SarniyaSync</p>
          <p className="text-xs text-white/60">Ruang operasional</p>
        </div>
      </div>

      <nav aria-label="Navigasi utama" className="flex gap-1 overflow-x-auto px-3 pb-3 lg:flex-col lg:px-4">
        {navigationItems.map((item) => {
          const isActive = pathname === item.href || (item.href !== "/" && pathname.startsWith(`${item.href}/`));

          return (
            <Link
              key={item.href}
              href={item.href}
              aria-current={isActive ? "page" : undefined}
              className={`flex shrink-0 items-center gap-3 rounded-md px-3 py-2.5 text-sm transition-colors lg:w-full ${
                isActive
                  ? "bg-white/12 font-medium text-white"
                  : "text-white/65 hover:bg-white/8 hover:text-white"
              }`}
            >
              <span className="size-1.5 rounded-full bg-[#d9f27e]" aria-hidden="true" />
              {item.label}
            </Link>
          );
        })}
        {role === "mitra" && navigationItems.length === 1 && (
          <p className="px-3 py-2 text-xs text-white/55">Belum ada toko yang ditugaskan.</p>
        )}
      </nav>

      <div className="mt-auto border-t border-white/10 px-4 py-4 lg:px-6 lg:py-5">
        <p className="text-xs text-white/50">Rantai pasok, lebih terhubung.</p>
        <button
          type="button"
          onClick={() => void handleLogout()}
          disabled={isLoggingOut}
          className="mt-3 w-full rounded-md border border-white/15 px-3 py-2 text-left text-sm text-white/80 transition-colors hover:bg-white/10 hover:text-white disabled:opacity-50"
        >
          {isLoggingOut ? "Keluar..." : "Keluar"}
        </button>
      </div>
    </aside>
  );
}