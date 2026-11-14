import { redirect } from "next/navigation";
import MitraNavigation from "@/components/mitra/mitra-navigation";
import Header from "@/components/shared/header";
import { SidebarProvider } from "@/context/sidebar-context";
import { normalizeAppRole } from "@/utils/supabase/auth";
import { createSupabaseServerClient } from "@/utils/supabase/server";

export const dynamic = "force-dynamic";

// Pemeriksaan Sesi dan Role Mitra
export default async function MitraLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  const supabase = await createSupabaseServerClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) redirect("/login");

  const { data: profile } = await supabase
    .from("profiles")
    .select("full_name, role")
    .eq("id", user.id)
    .maybeSingle();

  const role = normalizeAppRole(profile?.role);
  if (role !== "mitra") redirect("/");

  const userName =
    profile?.full_name?.trim() ||
    user.user_metadata?.full_name?.trim() ||
    user.email?.split("@")[0] ||
    "Mitra Sarniya";

  return (
    <SidebarProvider>
      <div className="flex min-h-screen w-full flex-col bg-[#F9FAFB] text-[#2d3440] lg:flex-row">
        <MitraNavigation />

        <div className="flex flex-1 flex-col min-w-0 transition-all duration-300">
          <Header
            title="SarniyaSync - Sistem Manajemen Inventaris Terpadu"
            user={{
              name: userName,
              role: "Mitra",
              email: user.email,
            }}
          />

          <main className="flex-1 w-full min-w-0 transition-all duration-300 overflow-y-auto bg-[#F9FAFB] p-3 sm:p-4 lg:p-5">
            {children}
          </main>
        </div>
      </div>
    </SidebarProvider>
  );
}

