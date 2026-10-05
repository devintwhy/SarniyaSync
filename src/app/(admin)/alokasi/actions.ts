"use server";

import { revalidatePath } from "next/cache";
import { getProfileRole } from "@/utils/supabase/auth";
import { createSupabaseServerClient } from "@/utils/supabase/server";

type AllocationInput = {
  storeId: string;
  productId: string;
  quantity: number;
};

type AllocationResult = {
  error?: string;
};

const uuidPattern = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

async function restoreCentralStock(
  supabase: Awaited<ReturnType<typeof createSupabaseServerClient>>,
  productId: string,
  expectedStock: number,
  previousStock: number,
) {
  const { data, error } = await supabase
    .from("products")
    .update({ stock_quantity: previousStock, updated_at: new Date().toISOString() })
    .eq("id", productId)
    .eq("stock_quantity", expectedStock)
    .select("id")
    .maybeSingle();

  if (error || !data) {
    console.error("Could not restore central product stock after allocation failure:", error?.message);
  }
}

export async function allocatePartnerStock(input: AllocationInput): Promise<AllocationResult> {
  try {
    if (
      !uuidPattern.test(input.storeId) ||
      !uuidPattern.test(input.productId) ||
      !Number.isSafeInteger(input.quantity) ||
      input.quantity < 1
    ) {
      return { error: "Pilih toko dan produk, lalu masukkan jumlah minimal 1." };
    }

    const supabase = await createSupabaseServerClient();
    const { data: { user }, error: authError } = await supabase.auth.getUser();
    if (authError || !user) return { error: "Sesi login diperlukan." };

    const role = await getProfileRole(supabase, user.id);
    if (role !== "admin" && role !== "pemilik") {
      return { error: "Hanya Admin/Pemilik yang dapat mengalokasikan stok." };
    }

    const { data: store, error: storeError } = await supabase
      .from("partner_stores")
      .select("id")
      .eq("id", input.storeId)
      .eq("is_active", true)
      .maybeSingle();
    if (storeError) throw storeError;
    if (!store) return { error: "Toko tidak ditemukan atau tidak aktif." };

    const { data: product, error: productError } = await supabase
      .from("products")
      .select("id, stock_quantity")
      .eq("id", input.productId)
      .eq("is_active", true)
      .maybeSingle();
    if (productError) throw productError;
    if (!product) return { error: "Produk tidak ditemukan atau tidak aktif." };
    if (product.stock_quantity < input.quantity) {
      return { error: `Stok pusat tidak cukup. Tersedia ${product.stock_quantity} unit.` };
    }

    const previousStock = product.stock_quantity;
    const updatedCentralStock = previousStock - input.quantity;
    const { data: updatedProduct, error: centralUpdateError } = await supabase
      .from("products")
      .update({ stock_quantity: updatedCentralStock, updated_at: new Date().toISOString() })
      .eq("id", product.id)
      .eq("stock_quantity", previousStock)
      .select("id")
      .maybeSingle();

    if (centralUpdateError) throw centralUpdateError;
    if (!updatedProduct) return { error: "Stok pusat berubah. Muat ulang dan coba lagi." };

    const { data: currentAllocation, error: allocationReadError } = await supabase
      .from("partner_store_inventory")
      .select("id, stock_quantity")
      .eq("partner_store_id", store.id)
      .eq("product_id", product.id)
      .maybeSingle();

    if (allocationReadError) {
      await restoreCentralStock(supabase, product.id, updatedCentralStock, previousStock);
      throw allocationReadError;
    }

    let allocationError: Error | null = null;
    if (currentAllocation) {
      const { data: updatedAllocation, error } = await supabase
        .from("partner_store_inventory")
        .update({
          stock_quantity: currentAllocation.stock_quantity + input.quantity,
          updated_at: new Date().toISOString(),
        })
        .eq("id", currentAllocation.id)
        .eq("stock_quantity", currentAllocation.stock_quantity)
        .select("id")
        .maybeSingle();

      if (error) allocationError = error;
      else if (!updatedAllocation) allocationError = new Error("Alokasi berubah bersamaan. Silakan coba lagi.");
    } else {
      const { error } = await supabase.from("partner_store_inventory").insert({
        partner_store_id: store.id,
        product_id: product.id,
        stock_quantity: input.quantity,
      });
      if (error) allocationError = error;
    }

    if (allocationError) {
      await restoreCentralStock(supabase, product.id, updatedCentralStock, previousStock);
      throw allocationError;
    }

    revalidatePath("/alokasi");
    revalidatePath("/partner/stok");
    revalidatePath("/partner");
    revalidatePath("/");
    revalidatePath("/inventory");

    return {};
  } catch (error) {
    console.error("Partner stock allocation failed:", error);
    return { error: error instanceof Error ? error.message : "Alokasi stok gagal." };
  }
}