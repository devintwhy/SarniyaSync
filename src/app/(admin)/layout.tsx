import { redirect } from "next/navigation";
import SidebarNavigation from "@/components/sidebar-navigation";
import Header from "@/components/header";
import { SidebarProvider } from "@/context/sidebar-context";
import { createSupabaseServerClient } from "@/utils/supabase/server";
import { getProfileRole } from "@/utils/supabase/auth";

export const dynamic = "force-dynamic";

export default async function AdminLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  const supabase = await createSupabaseServerClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) redirect("/login");
  const role = await getProfileRole(supabase, user.id);
  if (role === "mitra") redirect("/partner");

  const { data: profile } = await supabase
    .from("profiles")
    .select("full_name, role")
    .eq("id", user.id)
    .maybeSingle();

  const userName =
    profile?.full_name?.trim() ||
    user.user_metadata?.full_name?.trim() ||
    user.email?.split("@")[0] ||
    "Administrator";

  const userRole = role === "pemilik" ? "Pemilik" : "Admin";

  return (
    <SidebarProvider>
      <div className="flex min-h-screen w-full flex-col bg-[#F9FAFB] text-[#2d3440] lg:flex-row">
        <SidebarNavigation />

        <div className="flex flex-1 flex-col min-w-0">
          <Header
            title="SarniyaSync - Sistem Manajemen Inventaris Terpadu"
            user={{
              name: userName,
              role: userRole,
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
