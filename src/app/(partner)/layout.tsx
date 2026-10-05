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
    <div className="flex min-h-screen flex-col lg:flex-row">
      <PartnerNavigation />
      <main className="min-w-0 flex-1">{children}</main>
    </div>
  );
}