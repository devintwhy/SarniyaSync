import { redirect } from "next/navigation";
import PartnerNavigation from "@/components/partner-navigation";
import { getProfileRole } from "@/utils/supabase/auth";
import { createSupabaseServerClient } from "@/utils/supabase/server";

export const dynamic = "force-dynamic";

export default async function PartnerLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  const supabase = await createSupabaseServerClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect("/login");
  if (await getProfileRole(supabase, user.id) !== "mitra") redirect("/");

  return (
    <div className="relative flex min-h-screen w-full flex-col bg-[#e0e5ec] text-[#2d3440] lg:flex-row">
      <PartnerNavigation />
      <main className="relative flex-1 min-w-0 w-full overflow-y-auto bg-[#e0e5ec] transition-all duration-300 ease-in-out p-3 sm:p-4 lg:p-5">
        {children}
      </main>
    </div>
  );
}