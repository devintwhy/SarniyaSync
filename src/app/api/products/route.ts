import { createSupabaseServerClient } from "@/utils/supabase/server";

export const dynamic = "force-dynamic";

export async function GET(request: Request) {
  try {
    const search = new URL(request.url).searchParams.get("search")?.trim() ?? "";
    const requestedCategory = new URL(request.url).searchParams.get("category") ?? "";
    const category = requestedCategory === "all" ? "" : requestedCategory;

    if (
      category &&
      !productCategories.includes(category as (typeof productCategories)[number])
    ) {
      return Response.json({ error: "Kategori tidak valid." }, { status: 400 });
    }

    const supabase = await createSupabaseServerClient();
    const buildQuery = () => {
      let query = supabase.from("products").select("*");
      if (category) query = query.eq("category", category);
      return query;
    };

    if (search) {
      const pattern = `%${search}%`;
      const [nameResult, skuResult] = await Promise.all([
        buildQuery().ilike("name", pattern),
        buildQuery().ilike("sku", pattern),
      ]);

      if (nameResult.error || skuResult.error) {
        const error = nameResult.error ?? skuResult.error;
        console.error("Failed to search products in Supabase:", error?.message);
        return Response.json({ error: "Produk gagal dicari." }, { status: 500 });
      }

      const productsById = new Map(
        [...(nameResult.data ?? []), ...(skuResult.data ?? [])].map((product) => [product.id, product]),
      );
      return Response.json({ products: Array.from(productsById.values()) });
    }

    const { data, error } = await buildQuery();

    if (error) {
      console.error("Failed to fetch products from Supabase:", error.message);
      return Response.json({ error: "Produk gagal dimuat." }, { status: 500 });
    }

    return Response.json({ products: data ?? [] });
  } catch (error) {
    console.error("Products API configuration error:", error);
    return Response.json({ error: "Layanan produk belum tersedia." }, { status: 500 });
  }
}

const productCategories = ["Pashmina", "Segi empat", "Bergo"] as const;

export async function POST(request: Request) {
  try {
    const body: unknown = await request.json();

    if (!body || typeof body !== "object") {
      return Response.json({ error: "Data produk tidak valid." }, { status: 400 });
    }

    const product = body as Record<string, unknown>;
    const name = typeof product.name === "string" ? product.name.trim() : "";
    const category = product.category;
    const stockQuantity = Number(product.stock_quantity);
    const costPrice = Number(product.cost_price);
    const sellingPrice = Number(product.selling_price);
    const imageUrl =
      typeof product.image_url === "string" && product.image_url.trim()
        ? product.image_url.trim()
        : null;

    if (
      !name ||
      typeof category !== "string" ||
      !productCategories.includes(category as (typeof productCategories)[number]) ||
      !Number.isSafeInteger(stockQuantity) ||
      stockQuantity < 0 ||
      !Number.isSafeInteger(costPrice) ||
      costPrice < 0 ||
      !Number.isSafeInteger(sellingPrice) ||
      sellingPrice < 0
    ) {
      return Response.json({ error: "Periksa kembali data produk." }, { status: 400 });
    }

    const sku =
      typeof product.sku === "string" && product.sku.trim()
        ? product.sku.trim()
        : `HJ-${crypto.randomUUID().slice(0, 8).toUpperCase()}`;
    console.log("CEK ENV:", process.env.NEXT_PUBLIC_SUPABASE_URL);
    console.log(
      "CEK KEY:",
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY ? "ADA" : "KOSONG",
    );
    const supabase = await createSupabaseServerClient();
    const { data, error } = await supabase
      .from("products")
      .insert({
        sku,
        name,
        category,
        cost_price: costPrice,
        selling_price: sellingPrice,
        stock_quantity: stockQuantity,
        is_active: true,
        image_url: imageUrl,
      })
      .select()
      .single();

    if (error) {
      console.error("Failed to create product in Supabase:", error.message);
      return Response.json(
        { error: error.message },
        { status: error.code === "23505" ? 409 : 500 },
      );
    }

    return Response.json({ product: data }, { status: 201 });
  } catch (error) {
    console.error("ERROR DETAIL:", error);
    if (error instanceof TypeError) {
      console.error("ERROR CAUSE:", error.cause);
    }
    return Response.json({ error: "Layanan produk belum tersedia." }, { status: 500 });
  }
}