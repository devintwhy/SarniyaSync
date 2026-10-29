import { redirect } from "next/navigation";
import { createSupabaseServerClient } from "@/utils/supabase/server";
import { normalizeAppRole } from "@/utils/supabase/auth";
import ProfileForms from "./profile-forms";

export const dynamic = "force-dynamic";

export const metadata = {
  title: "Pengaturan Akun | SarniyaSync",
  description: "Perbarui nama lengkap dan password akun Anda.",
};

export default async function ProfilPage() {
  const supabase = await createSupabaseServerClient();

  const { data: { user }, error: authError } = await supabase.auth.getUser();
  if (authError || !user) redirect("/login");

  const { data: profile, error: profileError } = await supabase
    .from("profiles")
    .select("full_name, role")
    .eq("id", user.id)
    .maybeSingle();

  if (profileError) {
    console.error("Gagal memuat profil:", profileError.message);
  }

  const fullName = profile?.full_name ?? "";
  const role = normalizeAppRole(profile?.role) ?? "";
  const email = user.email ?? "";

  if (role === "mitra") {
    redirect("/profil-mitra");
  }

  return (
    <div className="w-full max-w-2xl mx-auto space-y-3 sm:space-y-4">
      <header>
        <span className="inline-block rounded-full bg-[#f7e4d4] px-2.5 py-0.5 text-xs font-bold text-[#9d5c4c]">
          Akun Saya
        </span>
        <h1 className="mt-1 text-2xl font-bold tracking-tight text-gray-900">Pengaturan Akun</h1>
        <p className="mt-0.5 text-sm text-gray-500">Kelola informasi profil dan keamanan akun Anda.</p>
      </header>

      <ProfileForms
        userId={user.id}
        initialName={fullName}
        email={email}
        role={role}
      />
    </div>
  );
}
