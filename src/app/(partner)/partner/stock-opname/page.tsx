import { redirect } from "next/navigation";
import { createSupabaseServerClient } from "@/utils/supabase/server";
import StockOpnameClient from "./stock-opname-client";

export const dynamic = "force-dynamic";

export default async function PartnerStockOpnamePage() {
  const supabase = await createSupabaseServerClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) redirect("/login");

  const { data: stores } = await supabase
    .from("partner_stores")
    .select("id, name")
    .eq("owner_id", user.id);

  const currentStore = stores?.[0] ?? null;
  const storeId = currentStore?.id ?? user.id;

  const { data: inventoryData } = await supabase
    .from("partner_store_inventory")
    .select("id, product_id, stock_quantity, products(id, name, sku)")
    .eq("partner_store_id", storeId);

  const productOptions = (inventoryData ?? [])
    .map((row: any) => {
      const p = Array.isArray(row.products) ? row.products[0] : row.products;
      if (!p) return null;
      return {
        id: p.id as string,
        name: p.name as string,
        sku: (p.sku as string) || "-",
        stock: Number(row.stock_quantity ?? 0),
      };
    })
    .filter(Boolean);

  let historyRecords: any[] = [];
  try {
    // Pengambilan riwayat penyesuaian mencakup identitas user dan ID toko mitra
    const allowedMitraIds = Array.from(
      new Set([user.id, storeId, ...(stores ?? []).map((s) => s.id)].filter(Boolean))
    );

    const { data: adjustments, error: adjError } = await supabase
      .from("stock_adjustments")
      .select("id, mitra_id, quantity_changed, reason, notes, created_at, products(name, sku)")
      .in("mitra_id", allowedMitraIds)
      .order("created_at", { ascending: false });

    if (adjError) {
      historyRecords = [];
    }

    if (adjustments && adjustments.length > 0) {
      historyRecords = adjustments.map((adj: any) => {
        const prod = Array.isArray(adj.products) ? adj.products[0] : adj.products;
        return {
          id: adj.id,
          date: new Intl.DateTimeFormat("id-ID", {
            dateStyle: "medium",
            timeStyle: "short",
          }).format(new Date(adj.created_at)),
          productName: prod?.name || "Produk",
          productSku: prod?.sku || "-",
          quantityChanged: adj.quantity_changed,
          reason: adj.reason,
          notes: adj.notes || "-",
        };
      });
    }
  } catch (err) {
    void err;
    historyRecords = [];
  }

  return (
    <StockOpnameClient
      mitraId={user.id}
      storeName={currentStore?.name ?? "Toko Mitra"}
      products={productOptions as any}
      initialHistory={historyRecords}
    />
  );
}

