import { NextResponse } from "next/server";
import { createSupabaseServerClient } from "@/utils/supabase/server";

export const dynamic = "force-dynamic";

export async function GET() {
  try {
    const supabase = await createSupabaseServerClient();

    // Pastikan hanya admin/pemilik yang bisa ekspor
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
        items,
        partner_stores ( name )
      `)
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      .order("sold_at", { ascending: false }) as any);

    if (error) {
      console.error("Gagal mengambil data penjualan:", error);
      return new NextResponse("Gagal mengambil data", { status: 500 });
    }

    // Header CSV
    const csvRows = [
      ["ID Transaksi", "Tanggal", "Toko Mitra", "Metode Pembayaran", "Total Penjualan", "Nama Produk", "Qty", "Harga Satuan", "Subtotal"].join(","),
    ];

    // Proses data
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

      // Jika tidak ada items, buat 1 baris rekap
      if (!tx.items || !Array.isArray(tx.items) || tx.items.length === 0) {
        csvRows.push(
          [
            `"${tx.transaction_number}"`,
            `"${txDate}"`,
            `"${storeName}"`,
            `"${paymentDisplay}"`,
            tx.total,
            "-",
            0,
            0,
            0
          ].join(",")
        );
        continue;
      }

      // Jika ada multi-items, pecah per item barang
      for (const item of tx.items) {
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        const record = item as any;
        const productName = record?.name || "Produk";
        const qty = Number(record?.quantity || 0);
        const unitPrice = Number(record?.unit_price || 0);
        const lineTotal = Number(record?.line_total || (unitPrice * qty));

        csvRows.push(
          [
            `"${tx.transaction_number}"`,
            `"${txDate}"`,
            `"${storeName}"`,
            `"${paymentDisplay}"`,
            tx.total,
            `"${productName}"`,
            qty,
            unitPrice,
            lineTotal
          ].join(",")
        );
      }
    }

    const csvContent = csvRows.join("\n");

    return new NextResponse(csvContent, {
      status: 200,
      headers: {
        "Content-Type": "text/csv; charset=utf-8",
        "Content-Disposition": `attachment; filename="laporan_penjualan_detail.csv"`,
      },
    });
  } catch (error) {
    console.error("Export error:", error);
    return new NextResponse("Internal Server Error", { status: 500 });
  }
}
