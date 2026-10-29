"use server";

import { createSupabaseServerClient } from "@/utils/supabase/server";

export interface StockAdjustmentWithProduct {
  id: string;
  quantity_changed: number;
  reason: string;
  created_at: string;
  products: {
    cost_price: number | null;
    name: string | null;
  } | {
    cost_price: number | null;
    name: string | null;
  }[] | null;
}

export interface MonthlyShrinkageLossResult {
  totalLoss: number;
  formattedTotalLoss: string;
  totalUnitsLost: number;
  records: StockAdjustmentWithProduct[];
}

export async function getMonthlyShrinkageLoss(): Promise<MonthlyShrinkageLossResult> {
  const supabase = await createSupabaseServerClient();

  const now = new Date();
  const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1).toISOString();

  // Ambil record penyesuaian khusus nilai negatif (barang keluar/hilang/rusak) bulan ini
  const { data, error } = (await supabase
    .from("stock_adjustments")
    .select(`
      id,
      quantity_changed,
      reason,
      created_at,
      products (
        cost_price,
        name
      )
    `)
    .lt("quantity_changed", 0)
    .gte("created_at", startOfMonth)
    .order("created_at", { ascending: false })) as unknown as {
      data: StockAdjustmentWithProduct[] | null;
      error: { message: string } | null;
    };

  if (error) {
    console.error("Gagal mengambil data penyesuaian stok:", error.message);
    return {
      totalLoss: 0,
      formattedTotalLoss: "Rp 0",
      totalUnitsLost: 0,
      records: [],
    };
  }

  const adjustments = data ?? [];

  // Kalkulasi Total Kerugian Penyusutan: absolute(quantity_changed) * cost_price (modal)
  let totalLoss = 0;
  let totalUnitsLost = 0;

  for (const item of adjustments) {
    const unitsLost = Math.abs(item.quantity_changed);
    totalUnitsLost += unitsLost;

    const product = Array.isArray(item.products)
      ? item.products[0]
      : item.products;

    const costPrice = Number(product?.cost_price ?? 0);
    totalLoss += unitsLost * costPrice;
  }

  const formattedTotalLoss = new Intl.NumberFormat("id-ID", {
    style: "currency",
    currency: "IDR",
    maximumFractionDigits: 0,
  }).format(totalLoss);

  return {
    totalLoss,
    formattedTotalLoss,
    totalUnitsLost,
    records: adjustments,
  };
}

