import { redirect } from "next/navigation";
import PartnerNavigation from "@/components/partner-navigation";
import { getProfileRole } from "@/utils/supabase/auth";
import { createSupabaseServerClient } from "@/utils/supabase/server";

export const dynamic = "force-dynamic";

export default async function PartnerLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  const supabase = await createSupabaseServerClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) redirect("/login");
  if ((await getProfileRole(supabase, user.id)) !== "mitra") redirect("/");

  return (
    <div className="flex min-h-screen w-full flex-col bg-[#e0e5ec] text-[#2d3440] lg:flex-row">
      {/* Sidebar Mitra Component */}
      <PartnerNavigation />

      {/* Main Content Wrapper: Otomatis melebar mengisi ruang kosong saat Sidebar disembunyikan */}
      <main className="flex-1 w-full min-w-0 transition-all duration-300 overflow-y-auto bg-[#e0e5ec] p-3 sm:p-4 lg:p-5">
        {children}
      </main>
    </div>
  );
}