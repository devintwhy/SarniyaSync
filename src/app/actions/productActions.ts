"use server";

import { revalidatePath } from "next/cache";
import { createSupabaseServerClient } from "@/utils/supabase/server";

export type ProductActionResult = {
  error?: string;
  success?: boolean;
};

export async function addProduct(formData: FormData): Promise<ProductActionResult> {
  try {
    const name = (formData.get("name") as string | null)?.trim() ?? "";
    const description = (formData.get("description") as string | null)?.trim() || null;
    const category = (formData.get("category") as string | null)?.trim() ?? "";
    const color = (formData.get("color") as string | null)?.trim() || null;
    const size = (formData.get("size") as string | null)?.trim() || null;
    const skuCustom = (formData.get("sku") as string | null)?.trim();
    const costPriceRaw = formData.get("cost_price");
    const sellingPriceRaw = formData.get("selling_price");
    const stockRaw = formData.get("stock_quantity");

    if (!name) return { error: "Nama produk wajib diisi." };
    if (!category) return { error: "Kategori wajib dipilih." };

    const cost_price = Number(costPriceRaw);
    const selling_price = Number(sellingPriceRaw);
    const stock_quantity = Number(stockRaw);

    if (!Number.isFinite(cost_price) || cost_price < 0) {
      return { error: "Harga modal tidak boleh minus atau kosong." };
    }
    if (!Number.isFinite(selling_price) || selling_price < 0) {
      return { error: "Harga jual tidak boleh minus atau kosong." };
    }
    if (!Number.isFinite(stock_quantity) || stock_quantity < 0) {
      return { error: "Stok awal tidak boleh minus atau kosong." };
    }

    const supabase = await createSupabaseServerClient();

    let imageUrl: string | null = null;
    const directImageUrl = (formData.get("image_url") as string | null)?.trim();
    if (directImageUrl) {
      imageUrl = directImageUrl;
    }

    const imageFile = formData.get("image");
    if (imageFile instanceof File && imageFile.size > 0 && typeof imageFile.name === "string") {
      const ext = imageFile.name.split(".").pop() || "jpg";
      const path = `product-images/${crypto.randomUUID()}.${ext}`;
      const arrayBuffer = await imageFile.arrayBuffer();
      const buffer = Buffer.from(arrayBuffer);

      const { data: uploadData, error: uploadError } = await supabase.storage
        .from("products")
        .upload(path, buffer, {
          contentType: imageFile.type || "image/jpeg",
          upsert: false,
        });

      if (!uploadError && uploadData) {
        const { data: publicUrlData } = supabase.storage
          .from("products")
          .getPublicUrl(uploadData.path);
        imageUrl = publicUrlData.publicUrl;
      }
    }

    const sku = skuCustom || `SKU-${Date.now()}`;

    const { error: insertError } = await supabase.from("products").insert({
      name,
      description,
      category,
      color,
      size,
      cost_price,
      selling_price,
      stock_quantity: Math.floor(stock_quantity),
      sku,
      image_url: imageUrl,
      is_active: true,
    });

    if (insertError) {
      return { error: insertError.message };
    }

    revalidatePath("/katalog");
    revalidatePath("/produk");
    revalidatePath("/inventory");

    return { success: true };
  } catch (error) {
    return {
      error: error instanceof Error ? error.message : "Terjadi kesalahan pada server saat menambahkan produk.",
    };
  }
}

