import { NextResponse } from "next/server";
import { getProfileRole, normalizeAppRole } from "@/utils/supabase/auth";
import { createSupabaseServerClient } from "@/utils/supabase/server";

export const dynamic = "force-dynamic";

const uuidPattern = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

export async function POST(request: Request) {
  try {
    const supabase = await createSupabaseServerClient();
    const { data: { user }, error: userError } = await supabase.auth.getUser();
    if (userError || !user) {
      return NextResponse.json({ error: "Sesi login diperlukan." }, { status: 401 });
    }

    const role = await getProfileRole(supabase, user.id);
    if (role !== "admin" && role !== "pemilik") {
      return NextResponse.json({ error: "Hanya Admin/Pemilik yang dapat menambahkan toko." }, { status: 403 });
    }

    const body: unknown = await request.json();
    if (!body || typeof body !== "object" || Array.isArray(body)) {
      return NextResponse.json({ error: "Data toko tidak valid." }, { status: 400 });
    }

    const store = body as Record<string, unknown>;
    const ownerId = typeof store.owner_id === "string" ? store.owner_id : "";
    const name = typeof store.name === "string" ? store.name.trim() : "";
    const address = typeof store.address === "string" ? store.address.trim() : "";
    const city = typeof store.city === "string" ? store.city.trim() : "";
    const phone = typeof store.phone === "string" ? store.phone.trim() : "";

    if (!uuidPattern.test(ownerId) || !name || name.length > 160) {
      return NextResponse.json({ error: "Pilih pemilik dan isi nama toko dengan benar." }, { status: 400 });
    }

    const { data: owner, error: ownerError } = await supabase
      .from("profiles")
      .select("id, role")
      .eq("id", ownerId)
      .maybeSingle();

    if (ownerError) throw ownerError;
    if (!owner || normalizeAppRole(owner.role) !== "mitra") {
      return NextResponse.json({ error: "Pemilik toko harus memiliki role Mitra." }, { status: 400 });
    }

    const { data, error } = await supabase
      .from("partner_stores")
      .insert({
        owner_id: ownerId,
        name,
        address: address || null,
        city: city || null,
        phone: phone || null,
        is_active: true,
      })
      .select("id, owner_id, name, address, city, phone, is_active, created_at")
      .single();

    if (error) throw error;
    return NextResponse.json({ store: data }, { status: 201 });
  } catch (error) {
    console.error("Failed to create partner store:", error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Toko mitra gagal dibuat." },
      { status: 500 },
    );
  }
}