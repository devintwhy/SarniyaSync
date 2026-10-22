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

// Alokasi stok massal (Bulk Stock Allocation)
export type BulkAllocationItem = {
  productId: string;
  quantity: number;
};

export type BulkAllocationInput = {
  storeId: string;
  items: BulkAllocationItem[];
};

export type BulkAllocationResult = {
  error?: string;
  success?: string;
  allocatedCount?: number;
};

export async function bulkAllocatePartnerStock(
  input: BulkAllocationInput,
): Promise<BulkAllocationResult> {
  try {
    if (!uuidPattern.test(input.storeId)) {
      return { error: "Pilih toko mitra tujuan yang valid." };
    }

    if (!Array.isArray(input.items) || input.items.length === 0) {
      return { error: "Pilih setidaknya 1 produk untuk dialokasikan." };
    }

    // Validasi kuantitas setiap item
    for (const item of input.items) {
      if (!uuidPattern.test(item.productId)) {
        return { error: "Data produk tidak valid." };
      }
      if (!Number.isSafeInteger(item.quantity) || item.quantity < 1) {
        return { error: "Jumlah alokasi setiap produk minimal harus 1 unit." };
      }
    }

    const supabase = await createSupabaseServerClient();
    const {
      data: { user },
      error: authError,
    } = await supabase.auth.getUser();
    if (authError || !user) return { error: "Sesi login diperlukan." };

    const role = await getProfileRole(supabase, user.id);
    if (role !== "admin" && role !== "pemilik") {
      return { error: "Hanya Admin/Pemilik yang berwenang mengalokasikan stok." };
    }

    // 1. Verifikasi toko mitra aktif
    const { data: store, error: storeError } = await supabase
      .from("partner_stores")
      .select("id, name")
      .eq("id", input.storeId)
      .eq("is_active", true)
      .maybeSingle();

    if (storeError) throw storeError;
    if (!store) return { error: "Toko mitra tidak ditemukan atau sedang nonaktif." };

    // 2. Ambil semua produk terkait dari katalog gudang pusat
    const productIds = input.items.map((i) => i.productId);
    const { data: products, error: productsError } = await supabase
      .from("products")
      .select("id, name, sku, stock_quantity")
      .in("id", productIds)
      .eq("is_active", true);

    if (productsError) throw productsError;
    if (!products || products.length !== input.items.length) {
      return { error: "Beberapa produk yang dipilih tidak ditemukan atau nonaktif di katalog." };
    }

    const productMap = new Map(products.map((p) => [p.id, p]));

    // 3. Verifikasi ketersediaan stok pusat untuk masing-masing item
    for (const item of input.items) {
      const prod = productMap.get(item.productId);
      if (!prod) {
        return { error: "Produk tidak valid." };
      }
      if (prod.stock_quantity < item.quantity) {
        return {
          error: `Stok gudang pusat untuk "${prod.name}" (${prod.sku}) tidak cukup. Tersedia: ${prod.stock_quantity} unit, diminta: ${item.quantity} unit.`,
        };
      }
    }

    // 4. Kurangi stok gudang pusat untuk setiap produk
    for (const item of input.items) {
      const prod = productMap.get(item.productId)!;
      const { error: deductError } = await supabase
        .from("products")
        .update({
          stock_quantity: prod.stock_quantity - item.quantity,
          updated_at: new Date().toISOString(),
        })
        .eq("id", prod.id);

      if (deductError) {
        throw new Error(`Gagal memperbarui stok pusat untuk ${productMap.get(item.productId)?.name}: ${deductError.message}`);
      }
    }

    // 5. Buat catatan kiriman (stock_transfers) dengan status DIKIRIM
    //    Stok TIDAK langsung ditambahkan ke toko mitra.
    //    Mitra perlu mengkonfirmasi penerimaan di halaman "Penerimaan Barang".
    const now = new Date().toISOString();
    const transferPayload = input.items.map((item) => ({
      product_id: item.productId,
      partner_store_id: store.id,
      quantity: item.quantity,
      status: "DIKIRIM",
      created_by: user.id,
      sent_at: now,
    }));

    const { error: transferError } = await supabase
      .from("stock_transfers")
      .insert(transferPayload);

    if (transferError) {
      // Log detail error agar bisa debug di server console
      console.error("[bulkAllocate] stock_transfers INSERT error:", {
        code: transferError.code,
        message: transferError.message,
        details: transferError.details,
        hint: transferError.hint,
        payload: transferPayload,
      });

      // Rollback: kembalikan stok gudang pusat yang sudah dikurangi
      for (const item of input.items) {
        const prod = productMap.get(item.productId)!;
        await supabase
          .from("products")
          .update({
            stock_quantity: prod.stock_quantity, // kembali ke stok awal
            updated_at: new Date().toISOString(),
          })
          .eq("id", prod.id);
      }
      throw new Error(`Gagal membuat catatan pengiriman: [${transferError.code}] ${transferError.message}${transferError.hint ? ` — Hint: ${transferError.hint}` : ""}`);
    }

    // 6. Revalidasi path
    revalidatePath("/alokasi");
    revalidatePath("/inventory");
    revalidatePath("/partner/penerimaan");
    revalidatePath("/dashboard");

    return {
      success: `Berhasil mengirim ${input.items.length} produk ke toko ${store.name}. Mitra perlu mengkonfirmasi penerimaan barang.`,
      allocatedCount: input.items.length,
    };
  } catch (error) {
    console.error("Bulk allocation failed:", error);
    return {
      error: error instanceof Error ? error.message : "Alokasi massal stok gagal diproses.",
    };
  }
}
