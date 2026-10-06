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
    const { data: transactions, error } = await supabase
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
      .order("sold_at", { ascending: false });

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
      
      // Jika tidak ada items, buat 1 baris rekap
      if (!tx.items || !Array.isArray(tx.items) || tx.items.length === 0) {
        csvRows.push(
          [
            `"${tx.transaction_number}"`,
            `"${txDate}"`,
            `"${storeName}"`,
            `"${tx.payment_method || '-'}"`,
            tx.total,
            "-",
            0,
            0,
            0
          ].join(",")
        );
        continue;
      }

      // Jika ada items (multi-item JSONB), jabarkan per baris item
      for (const item of tx.items) {
        const record = item as any;
        csvRows.push(
          [
            `"${tx.transaction_number}"`,
            `"${txDate}"`,
            `"${storeName}"`,
            `"${tx.payment_method || '-'}"`,
            tx.total, // Diulang untuk tiap baris (atau bisa dikosongkan)
            `"${record.productName || record.name || '-'}"`,
            record.quantity || 0,
            record.price || record.unit_price || 0,
            (record.quantity || 0) * (record.price || record.unit_price || 0)
          ].join(",")
        );
      }
    }

    const csvContent = csvRows.join("\n");

    return new NextResponse(csvContent, {
      status: 200,
      headers: {
        "Content-Type": "text/csv; charset=utf-8",
        "Content-Disposition": `attachment; filename="Laporan_Penjualan_${new Date().toISOString().split("T")[0]}.csv"`,
      },
    });
  } catch (error) {
    console.error("Export error:", error);
    return new NextResponse("Internal Server Error", { status: 500 });
  }
}
