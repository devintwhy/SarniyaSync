import { createSupabaseServerClient } from "@/utils/supabase/server";

export const dynamic = "force-dynamic";

type ProductRouteContext = {
  params: { id: string };
};

const productCategories = ["Pashmina", "Segi empat", "Bergo"] as const;
const uuidPattern = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

function parseNonNegativeInteger(value: unknown) {
  if (typeof value !== "string" && typeof value !== "number") return null;
  if (typeof value === "string" && value.trim() === "") return null;

  const number = Number(value);
  return Number.isSafeInteger(number) && number >= 0 ? number : null;
}

function invalidId(id: string) {
  return !uuidPattern.test(id);
}

export async function GET(_request: Request, { params }: ProductRouteContext) {
  if (invalidId(params.id)) {
    return Response.json({ error: "ID produk tidak valid." }, { status: 400 });
  }

  try {
    const supabase = await createSupabaseServerClient();
    const { data, error } = await supabase
      .from("products")
      .select("*")
      .eq("id", params.id)
      .maybeSingle();

    if (error) {
      console.error("Failed to fetch product from Supabase:", error.message);
      return Response.json({ error: error.message }, { status: 500 });
    }

    if (!data) {
      return Response.json({ error: "Produk tidak ditemukan." }, { status: 404 });
    }

    return Response.json({ product: data });
  } catch (error) {
    console.error("Product fetch error:", error);
    return Response.json({ error: "Produk gagal dimuat." }, { status: 500 });
  }
}

export async function PATCH(request: Request, { params }: ProductRouteContext) {
  if (invalidId(params.id)) {
    return Response.json({ error: "ID produk tidak valid." }, { status: 400 });
  }

  try {
    const body: unknown = await request.json();
    if (!isRecord(body)) {
      return Response.json({ error: "Data produk tidak valid." }, { status: 400 });
    }

    const sku = typeof body.sku === "string" ? body.sku.trim() : "";
    const name = typeof body.name === "string" ? body.name.trim() : "";
    const category = body.category;
    const stockQuantity = parseNonNegativeInteger(body.stock_quantity);
    const costPrice = parseNonNegativeInteger(body.cost_price);
    const sellingPrice = parseNonNegativeInteger(body.selling_price);

    if (
      !sku ||
      !name ||
      typeof category !== "string" ||
      !productCategories.includes(category as (typeof productCategories)[number]) ||
      stockQuantity === null ||
      costPrice === null ||
      sellingPrice === null
    ) {
      return Response.json({ error: "Periksa kembali data produk." }, { status: 400 });
    }

    const optionalText = (field: string) =>
      typeof body[field] === "string" ? body[field].trim() || null : null;

    const supabase = await createSupabaseServerClient();
    const { data, error } = await supabase
      .from("products")
      .update({
        sku,
        name,
        category,
        description: optionalText("description"),
        color: optionalText("color"),
        size: optionalText("size"),
        stock_quantity: stockQuantity,
        cost_price: costPrice,
        selling_price: sellingPrice,
        image_url: optionalText("image_url"),
        updated_at: new Date().toISOString(),
      })
      .eq("id", params.id)
      .select()
      .maybeSingle();

    if (error) {
      console.error("Failed to update product in Supabase:", error.message);
      return Response.json({ error: error.message }, { status: error.code === "23505" ? 409 : 500 });
    }

    if (!data) {
      return Response.json({ error: "Produk tidak ditemukan." }, { status: 404 });
    }

    return Response.json({ product: data });
  } catch (error) {
    console.error("Product update error:", error);
    return Response.json({ error: "Produk gagal diperbarui." }, { status: 500 });
  }
}

export async function DELETE(_request: Request, { params }: ProductRouteContext) {
  if (invalidId(params.id)) {
    return Response.json({ error: "ID produk tidak valid." }, { status: 400 });
  }

  try {
    const supabase = await createSupabaseServerClient();
    const { data, error } = await supabase
      .from("products")
      .delete()
      .eq("id", params.id)
      .select("id")
      .maybeSingle();

    if (error) {
      console.error("Failed to delete product from Supabase:", error.message);
      return Response.json({ error: error.message }, { status: 500 });
    }

    if (!data) {
      return Response.json({ error: "Produk tidak ditemukan." }, { status: 404 });
    }

    return Response.json({ success: true });
  } catch (error) {
    console.error("Product deletion error:", error);
    return Response.json({ error: "Produk gagal dihapus." }, { status: 500 });
  }
}