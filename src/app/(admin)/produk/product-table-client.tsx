"use client";

import { useState, useMemo } from "react";

type Product = {
  id: string;
  name: string;
  sku: string;
  category: string;
  cost_price: number;
  selling_price: number;
  stock_quantity: number;
  is_active: boolean;
};

type ProductTableClientProps = {
  products: Product[];
  errorMessage?: string;
};

function formatRupiah(value: number) {
  return new Intl.NumberFormat("id-ID", {
    style: "currency",
    currency: "IDR",
    maximumFractionDigits: 0,
  }).format(value);
}

export default function ProductTableClient({ products, errorMessage }: ProductTableClientProps) {
  const [searchTerm, setSearchTerm] = useState("");
  const [selectedCategory, setSelectedCategory] = useState("all");

  const categories = useMemo(() => {
    const set = new Set<string>();
    products.forEach((p) => {
      if (p.category) set.add(p.category);
    });
    return Array.from(set);
  }, [products]);

  const filteredProducts = useMemo(() => {
    const q = searchTerm.toLowerCase().trim();

    return products.filter((product) => {
      if (selectedCategory !== "all" && product.category !== selectedCategory) {
        return false;
      }

      if (!q) return true;

      const matchName = product.name.toLowerCase().includes(q);
      const matchSku = product.sku.toLowerCase().includes(q);
      const matchCategory = product.category.toLowerCase().includes(q);

      return matchName || matchSku || matchCategory;
    });
  }, [products, searchTerm, selectedCategory]);

  return (
    <div>
      {/* ── Search Bar & Category Filter ──────────────────────────────────── */}
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between px-5 py-4 border-b border-slate-100 bg-slate-50/60">
        <div className="relative flex-1 max-w-md">
          <div className="pointer-events-none absolute inset-y-0 left-0 flex items-center pl-3 text-[#7a8394]">
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none">
              <path
                d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z"
                stroke="currentColor"
                strokeWidth="2"
                strokeLinecap="round"
                strokeLinejoin="round"
              />
            </svg>
          </div>
          <input
            type="text"
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            placeholder="Cari nama produk, SKU, kategori..."
            className="w-full rounded-lg border border-slate-200 bg-white py-2 pl-9 pr-8 text-sm text-[#2d3440] outline-none transition-all placeholder:text-[#9ea8b4] focus:border-[#cc9787] focus:ring-2 focus:ring-[#cc9787]/25"
          />
          {searchTerm && (
            <button
              type="button"
              onClick={() => setSearchTerm("")}
              className="absolute inset-y-0 right-0 flex items-center pr-2.5 text-xs text-[#7a8394] hover:text-[#2d3440]"
            >
              ✕
            </button>
          )}
        </div>

        <div className="flex items-center gap-2">
          <label htmlFor="filter-cat" className="text-xs font-medium text-[#576071]">
            Kategori:
          </label>
          <select
            id="filter-cat"
            value={selectedCategory}
            onChange={(e) => setSelectedCategory(e.target.value)}
            className="rounded-lg border border-slate-200 bg-white px-2.5 py-1.5 text-xs font-medium text-[#2d3440] outline-none focus:border-[#cc9787]"
          >
            <option value="all">Semua Kategori</option>
            {categories.map((cat) => (
              <option key={cat} value={cat}>
                {cat}
              </option>
            ))}
          </select>
          <span className="text-xs font-medium text-[#cc9787] ml-2">
            {filteredProducts.length} dari {products.length} produk
          </span>
        </div>
      </div>

      {/* ── Tabel Produk ─────────────────────────────────────────────────── */}
      <div className="overflow-x-auto">
        <table className="w-full min-w-[800px] text-left text-sm">
          <thead className="bg-[#f0f2f5] text-xs uppercase tracking-wider text-[#576071]">
            <tr>
              <th scope="col" className="px-5 py-3.5 font-bold">Nama Produk / SKU</th>
              <th scope="col" className="px-5 py-3.5 font-bold">Kategori</th>
              <th scope="col" className="px-5 py-3.5 text-right font-bold">Harga Modal</th>
              <th scope="col" className="px-5 py-3.5 text-right font-bold">Harga Jual</th>
              <th scope="col" className="px-5 py-3.5 text-right font-bold">Stok Pusat</th>
              <th scope="col" className="px-5 py-3.5 font-bold">Status</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100">
            {filteredProducts.length === 0 ? (
              <tr>
                <td colSpan={6} className="px-5 py-12 text-center text-sm text-[#7a8394]">
                  {errorMessage
                    ? "Terjadi kesalahan saat memuat produk."
                    : searchTerm
                    ? `Tidak ada produk yang cocok dengan pencarian "${searchTerm}".`
                    : "Belum ada produk terdaftar."}
                </td>
              </tr>
            ) : (
              filteredProducts.map((product) => {
                const isLowStock = product.stock_quantity <= 5;
                return (
                  <tr key={product.id} className="transition-colors hover:bg-slate-50/70">
                    <td className="px-5 py-4">
                      <p className="font-semibold text-[#2d3440]">{product.name}</p>
                      <p className="mt-0.5 text-xs text-[#7a8394] font-mono">{product.sku}</p>
                    </td>

                    <td className="whitespace-nowrap px-5 py-4">
                      <span className="inline-flex items-center rounded-full bg-[#f7e4d4] px-2.5 py-0.5 text-xs font-medium text-[#9d5c4c]">
                        {product.category}
                      </span>
                    </td>

                    <td className="whitespace-nowrap px-5 py-4 text-right tabular-nums text-[#576071]">
                      {formatRupiah(product.cost_price)}
                    </td>

                    <td className="whitespace-nowrap px-5 py-4 text-right tabular-nums font-semibold text-[#2d3440]">
                      {formatRupiah(product.selling_price)}
                    </td>

                    <td className="whitespace-nowrap px-5 py-4 text-right">
                      <span
                        className={`inline-flex items-center gap-1 rounded-full px-2.5 py-0.5 text-xs font-semibold tabular-nums ${
                          isLowStock
                            ? "bg-rose-50 text-rose-700"
                            : "bg-emerald-50 text-emerald-700"
                        }`}
                      >
                        {isLowStock && (
                          <span aria-hidden="true" className="size-1.5 rounded-full bg-rose-500" />
                        )}
                        {product.stock_quantity} pcs
                      </span>
                    </td>

                    <td className="whitespace-nowrap px-5 py-4">
                      <span
                        className={`inline-flex items-center gap-1.5 text-xs font-medium ${
                          product.is_active ? "text-emerald-700" : "text-[#7a8394]"
                        }`}
                      >
                        <span
                          aria-hidden="true"
                          className={`size-2 rounded-full ${
                            product.is_active ? "bg-emerald-500" : "bg-slate-400"
                          }`}
                        />
                        {product.is_active ? "Aktif" : "Nonaktif"}
                      </span>
                    </td>
                  </tr>
                );
              })
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
