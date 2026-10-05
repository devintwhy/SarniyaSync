"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { useState } from "react";
import { createSupabaseBrowserClient } from "@/utils/supabase/client";

const partnerRoutes = {
  dashboard: "/partner",
  stock: "/partner/stok",
  transactions: "/partner/transaksi",
} as const;

const navigationItems = [
  { label: "Dashboard", href: partnerRoutes.dashboard },
  { label: "Stok Toko", href: partnerRoutes.stock },
  { label: "Riwayat Transaksi", href: partnerRoutes.transactions },
];

export default function PartnerNavigation() {
  const pathname = usePathname();
  const router = useRouter();
  const [isLoggingOut, setIsLoggingOut] = useState(false);
  const [errorMessage, setErrorMessage] = useState("");

  async function handleLogout() {
    setIsLoggingOut(true);
    setErrorMessage("");

    try {
      const supabase = createSupabaseBrowserClient();
      const { error } = await supabase.auth.signOut();
      if (error) throw error;
      router.replace("/login");
      router.refresh();
    } catch (error) {
      setErrorMessage(error instanceof Error ? error.message : "Logout gagal.");
      setIsLoggingOut(false);
    }
  }

  return (
    <aside className="flex w-full flex-col bg-[#173b32] text-white lg:min-h-screen lg:w-64 lg:shrink-0">
      <div className="flex items-center gap-3 px-6 py-5 lg:py-8">
        <div className="flex size-10 items-center justify-center rounded-lg bg-[#d9f27e] text-lg font-bold text-[#173b32]">S</div>
        <div>
          <p className="text-lg font-semibold">SarniyaSync</p>
          <p className="text-xs text-white/60">Portal Mitra</p>
        </div>
      </div>

      <nav aria-label="Navigasi Mitra" className="flex gap-1 overflow-x-auto px-3 pb-3 lg:flex-col lg:px-4">
        {navigationItems.map((item) => {
          const isActive = pathname === item.href || pathname.startsWith(`${item.href}/`);
          return (
            <Link
              key={item.href}
              href={item.href}
              aria-current={isActive ? "page" : undefined}
              className={`flex shrink-0 items-center gap-3 rounded-md px-3 py-2.5 text-sm transition-colors lg:w-full ${isActive ? "bg-white/12 font-medium text-white" : "text-white/65 hover:bg-white/8 hover:text-white"}`}
            >
              <span className="size-1.5 rounded-full bg-[#d9f27e]" aria-hidden="true" />
              {item.label}
            </Link>
          );
        })}
      </nav>

      <div className="mt-auto border-t border-white/10 px-4 py-4 lg:px-6 lg:py-5">
        {errorMessage && <p role="alert" className="mb-3 text-xs text-[#ffd6ca]">{errorMessage}</p>}
        <button
          type="button"
          onClick={() => void handleLogout()}
          disabled={isLoggingOut}
          className="w-full rounded-md border border-white/15 px-3 py-2 text-left text-sm text-white/80 transition-colors hover:bg-white/10 hover:text-white disabled:opacity-50"
        >
          {isLoggingOut ? "Keluar..." : "Keluar"}
        </button>
      </div>
    </aside>
  );
}