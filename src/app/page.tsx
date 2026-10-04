import Link from "next/link";
import { createSupabaseServerClient } from "@/utils/supabase/server";

export const dynamic = "force-dynamic";

type DashboardProduct = {
  id: string;
  sku: string;
  name: string;
  category: string;
  stock_quantity: number;
  selling_price: number | string;
};

const PAGE_SIZE = 1000;

async function getProducts() {
  const supabase = await createSupabaseServerClient();
  const products: DashboardProduct[] = [];

  for (let offset = 0; ; offset += PAGE_SIZE) {
    const { data, error } = await supabase
      .from("products")
      .select("id, sku, name, category, stock_quantity, selling_price")
      .order("id", { ascending: true })
      .range(offset, offset + PAGE_SIZE - 1);

    if (error) throw new Error(error.message);

    const page = (data ?? []) as DashboardProduct[];
    products.push(...page);
    if (page.length < PAGE_SIZE) break;
  }

  return products;
}

const numberFormatter = new Intl.NumberFormat("id-ID");
const currencyFormatter = new Intl.NumberFormat("id-ID", {
  style: "currency",
  currency: "IDR",
  maximumFractionDigits: 0,
});

function getStock(product: DashboardProduct) {
  const stock = Number(product.stock_quantity);
  return Number.isFinite(stock) ? stock : 0;
}

function getSellingPrice(product: DashboardProduct) {
  const price = Number(product.selling_price);
  return Number.isFinite(price) ? price : 0;
}

export default async function Home() {
  let products: DashboardProduct[] = [];
  let loadError = "";

  try {
    products = await getProducts();
  } catch (error) {
    console.error("Failed to load dashboard products:", error);
    loadError = "Data produk dari Supabase tidak dapat dimuat.";
  }

  const totalStock = products.reduce((total, product) => total + getStock(product), 0);
  const totalAssetValue = products.reduce(
    (total, product) => total + getStock(product) * getSellingPrice(product),
    0,
  );
  const lowStockProducts = products
    .filter((product) => getStock(product) <= 5)
    .sort((first, second) => getStock(first) - getStock(second));

  const metrics = [
    {
      label: "Total Produk",
      value: loadError ? "—" : numberFormatter.format(products.length),
      detail: "Produk tercatat di katalog",
      valueClass: "text-[#173b32]",
    },
    {
      label: "Total Stok Keseluruhan",
      value: loadError ? "—" : numberFormatter.format(totalStock),
      detail: "Unit tersedia di seluruh produk",
      valueClass: "text-[#173b32]",
    },
    {
      label: "Total Nilai Aset",
      value: loadError ? "—" : currencyFormatter.format(totalAssetValue),
      detail: "Stok dikalikan harga jual",
      valueClass: "text-[#315d3e]",
    },
  ];

  return (
    <div className="mx-auto max-w-7xl px-5 py-8 sm:px-8 lg:px-10 lg:py-10">
      <header className="mb-8 flex flex-col justify-between gap-4 sm:flex-row sm:items-end">
        <div>
          <p className="mb-2 text-sm font-medium text-[#557b64]">Ringkasan operasional</p>
          <h1 className="text-3xl font-semibold tracking-tight text-[#173b32]">Dashboard</h1>
          <p className="mt-2 text-sm text-[#68756e]">Pantau nilai dan ketersediaan stok produk.</p>
        </div>
        <Link
          href="/inventory"
          className="inline-flex min-h-10 items-center justify-center self-start rounded-md border border-[#d9e1d9] bg-white px-4 text-sm font-medium text-[#315d3e] transition-colors hover:bg-[#f7f9f6] sm:self-auto"
        >
          Kelola inventaris
        </Link>
      </header>

      {loadError && (
        <p role="alert" className="mb-5 rounded-md border border-[#f0d4cc] bg-[#fff5f1] px-4 py-3 text-sm text-[#9b4936]">
          {loadError}
        </p>
      )}

      <section aria-label="Statistik produk" className="grid gap-4 md:grid-cols-3">
        {metrics.map((metric) => (
          <article key={metric.label} className="rounded-md border border-[#e1e7e0] bg-white p-5 shadow-sm shadow-[#173b32]/5">
            <p className="text-sm font-medium text-[#68756e]">{metric.label}</p>
            <p className={`mt-3 break-words text-2xl font-semibold text-balance ${metric.valueClass}`}>
              {metric.value}
            </p>
            <p className="mt-2 text-xs text-[#7b877f]">{metric.detail}</p>
          </article>
        ))}
      </section>

      <section aria-label="Peringatan stok menipis" className="mt-8 overflow-hidden rounded-md border border-[#ead8b5] bg-white shadow-sm shadow-[#765a36]/5">
        <div className="flex flex-col gap-1 border-b border-[#f0e4cd] bg-[#fff8e9] px-5 py-4 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <h2 className="font-semibold text-[#765a36]">Peringatan stok menipis</h2>
            <p className="mt-1 text-sm text-[#8b7352]">Produk dengan stok 5 unit atau kurang.</p>
          </div>
          <span className="text-sm font-medium text-[#9a6733]">
            {loadError ? "—" : `${lowStockProducts.length} produk`}
          </span>
        </div>

        {loadError ? (
          <p className="px-5 py-8 text-center text-sm text-[#68756e]">Daftar peringatan belum tersedia.</p>
        ) : lowStockProducts.length === 0 ? (
          <p className="px-5 py-8 text-center text-sm text-[#557b64]">Tidak ada produk dengan stok menipis.</p>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full min-w-[680px] text-left text-sm">
              <thead className="bg-[#fffdf8] text-xs uppercase text-[#8b7352]">
                <tr>
                  <th scope="col" className="px-5 py-3 font-medium">SKU</th>
                  <th scope="col" className="px-5 py-3 font-medium">Nama Produk</th>
                  <th scope="col" className="px-5 py-3 font-medium">Kategori</th>
                  <th scope="col" className="px-5 py-3 text-right font-medium">Stok</th>
                  <th scope="col" className="px-5 py-3 text-right font-medium">Harga Jual</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-[#f0e8d8]">
                {lowStockProducts.map((product) => {
                  const stock = getStock(product);

                  return (
                    <tr key={product.id} className="hover:bg-[#fffdf8]">
                      <td className="whitespace-nowrap px-5 py-4 text-xs text-[#7b877f]">{product.sku}</td>
                      <th scope="row" className="px-5 py-4 font-medium text-[#293a32]">{product.name}</th>
                      <td className="whitespace-nowrap px-5 py-4 text-[#68756e]">{product.category}</td>
                      <td className="whitespace-nowrap px-5 py-4 text-right">
                        <span className={`inline-flex min-w-9 justify-center rounded-sm px-2 py-1 text-xs font-semibold ${stock === 0 ? "bg-[#fff0eb] text-[#a44d36]" : "bg-[#fff4d8] text-[#946019]"}`}>
                          {numberFormatter.format(stock)}
                        </span>
                      </td>
                      <td className="whitespace-nowrap px-5 py-4 text-right text-[#293a32]">
                        {currencyFormatter.format(getSellingPrice(product))}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </section>
    </div>
  );
}