import { NextResponse } from "next/server";
import { createSupabaseServerClient } from "@/utils/supabase/server";
import { getProfileRole } from "@/utils/supabase/auth";

export const dynamic = "force-dynamic";

const uuidPattern = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
const paymentMethods = ["cash", "transfer", "qris"] as const;

export async function POST(request: Request) {
  try {
    const supabase = await createSupabaseServerClient();
    const { data: { user }, error: userError } = await supabase.auth.getUser();
    if (userError || !user) {
      return NextResponse.json({ error: "Sesi login diperlukan." }, { status: 401 });
    }

    if (await getProfileRole(supabase, user.id) !== "mitra") {
      return NextResponse.json({ error: "Hanya Mitra yang dapat mencatat penjualan." }, { status: 403 });
    }

    const body: unknown = await request.json();
    if (!body || typeof body !== "object" || Array.isArray(body)) {
      return NextResponse.json({ error: "Data penjualan tidak valid." }, { status: 400 });
    }

    const sale = body as Record<string, unknown>;
    const storeId = typeof sale.partner_store_id === "string" ? sale.partner_store_id : "";
    const productId = typeof sale.product_id === "string" ? sale.product_id : "";
    const quantity = Number(sale.quantity);
    const paymentMethod = typeof sale.payment_method === "string" ? sale.payment_method : "cash";

    if (
      !uuidPattern.test(storeId) ||
      !uuidPattern.test(productId) ||
      !Number.isSafeInteger(quantity) ||
      quantity < 1 ||
      !paymentMethods.includes(paymentMethod as (typeof paymentMethods)[number])
    ) {
      return NextResponse.json({ error: "Periksa kembali toko, produk, jumlah, dan pembayaran." }, { status: 400 });
    }

    const { data: transactionId, error } = await supabase.rpc("record_partner_sale", {
      p_partner_store_id: storeId,
      p_product_id: productId,
      p_quantity: quantity,
      p_payment_method: paymentMethod,
    });

    if (error) {
      console.error("Failed to record partner sale:", error.message);
      return NextResponse.json({ error: error.message }, { status: 400 });
    }

    return NextResponse.json({ transaction_id: transactionId }, { status: 201 });
  } catch (error) {
    console.error("Partner sale API error:", error);
    return NextResponse.json({ error: "Penjualan gagal dicatat." }, { status: 500 });
  }
}