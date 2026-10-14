import { NextResponse } from "next/server";
import { createSupabaseServerClient } from "@/utils/supabase/server";

export const dynamic = "force-dynamic";

export async function GET() {
  try {
    const supabase = await createSupabaseServerClient();

    // Pastikan hanya yang sudah login yang bisa mengekspor
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) {
      return new NextResponse("Unauthorized", { status: 401 });
    }

    // Ambil data transaksi beserta nama mitra
    const { data: transactions, error } = await (supabase
      .from("sales_transactions")
      .select(`
        id,
        transaction_number,
        sold_at,
        total,
        payment_method,
        partner_stores ( name )
      `)
      .order("sold_at", { ascending: false }) as any);

    if (error) {
      console.error("Gagal mengambil data penjualan:", error);
      return new NextResponse("Gagal mengambil data", { status: 500 });
    }

    // Header CSV (5 kolom utama)
    const csvRows = [
      ["ID Transaksi", "Tanggal", "Nama Toko", "Metode Pembayaran", "Total"].join(","),
    ];

    // Proses data transaksi
    for (const tx of transactions ?? []) {
      const storeName = Array.isArray(tx.partner_stores)
        ? tx.partner_stores[0]?.name
        : tx.partner_stores?.name || "Unknown Store";

      const txDate = new Date(tx.sold_at).toLocaleString("id-ID");

      const paymentRaw = String(tx.payment_method || "cash").toLowerCase().trim();
      const paymentDisplay =
        paymentRaw === "qris"
          ? "QRIS"
          : paymentRaw === "transfer"
          ? "Transfer"
          : "Tunai";

      csvRows.push(
        [
          `"${tx.transaction_number}"`,
          `"${txDate}"`,
          `"${storeName}"`,
          `"${paymentDisplay}"`,
          tx.total
        ].join(",")
      );
    }

    const csvContent = csvRows.join("\n");

    return new NextResponse(csvContent, {
      status: 200,
      headers: {
        "Content-Type": "text/csv; charset=utf-8",
        "Content-Disposition": `attachment; filename="laporan_penjualan.csv"`,
      },
    });
  } catch (error) {
    console.error("Export error:", error);
    return new NextResponse("Internal Server Error", { status: 500 });
  }
}
