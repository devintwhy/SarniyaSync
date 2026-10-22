"use client";

import { useState, useMemo, useEffect } from "react";
import Image from "next/image";
import { Tag, Package } from "lucide-react";
import { useSidebar } from "@/context/sidebar-context";

type Product = {
  id: string;
  name: string;
  sku: string;
  category: string;
  cost_price: number;
  selling_price: number;
  stock_quantity: number;
  image_url?: string | null;
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

export default function ProductTableClient({ products: initialProducts, errorMessage }: ProductTableClientProps) {
  const { isSidebarOpen } = useSidebar();
  const [products, setProducts] = useState<Product[]>(initialProducts);
  const [searchTerm, setSearchTerm] = useState("");
  const [selectedCategory, setSelectedCategory] = useState("all");

  useEffect(() => {
    setProducts(initialProducts);
  }, [initialProducts]);

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

      const matchName = (product.name || "").toLowerCase().includes(q);
      const matchSku = (product.sku || "").toLowerCase().includes(q);
      const matchCategory = (product.category || "").toLowerCase().includes(q);

      return matchName || matchSku || matchCategory;
    });
  }, [products, searchTerm, selectedCategory]);

  return (
    <div className="space-y-3 sm:space-y-4">
      <div className="rounded-xl bg-white border border-gray-200 shadow-sm p-3 sm:p-3.5">
        <div className="flex flex-col gap-2.5 sm:flex-row sm:items-center sm:justify-between">
          <div className="relative flex-1 max-w-md">
            <div className="pointer-events-none absolute inset-y-0 left-0 flex items-center pl-3 text-gray-400">
              <svg width="15" height="15" viewBox="0 0 24 24" fill="none">
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
              placeholder="Cari nama produk, SKU, atau kategori..."
              className="h-9 w-full rounded-lg bg-gray-50 border border-gray-200 pl-9 pr-8 text-xs sm:text-sm text-gray-900 outline-none transition-all placeholder:text-gray-400 focus:outline-none focus:ring-2 focus:ring-terracotta-clay/20 focus:border-terracotta-clay"
            />
            {searchTerm && (
              <button
                type="button"
                onClick={() => setSearchTerm("")}
                className="absolute inset-y-0 right-0 flex items-center pr-2.5 text-xs text-gray-400 hover:text-gray-600"
              >
                ✕
              </button>
            )}
          </div>

          <div className="flex items-center gap-2">
            <label htmlFor="filter-cat" className="text-xs font-bold text-gray-600">
              Kategori:
            </label>
            <select
              id="filter-cat"
              value={selectedCategory}
              onChange={(e) => setSelectedCategory(e.target.value)}
              className="h-9 rounded-lg bg-gray-50 border border-gray-200 px-3 text-xs font-semibold text-gray-900 outline-none transition-all focus:outline-none focus:ring-2 focus:ring-terracotta-clay/20 focus:border-terracotta-clay"
            >
              <option value="all">Semua Kategori</option>
              {categories.map((cat) => (
                <option key={cat} value={cat}>
                  {cat}
                </option>
              ))}
            </select>
            <span className="text-xs font-bold text-terracotta-clay ml-1 whitespace-nowrap">
              {filteredProducts.length} produk
            </span>
          </div>
        </div>

        {errorMessage && (
          <p className="mt-2.5 rounded-lg border border-rose-300 bg-rose-50 px-3 py-1.5 text-xs text-rose-800">
            {errorMessage}
          </p>
        )}
      </div>

      {filteredProducts.length === 0 ? (
        <div className="rounded-xl bg-white border border-gray-200 p-8 text-center shadow-sm">
          <Tag className="mx-auto h-9 w-9 text-gray-400 mb-2" />
          <p className="mt-2 text-sm font-bold text-gray-900">
            {searchTerm
              ? `Tidak ditemukan produk dengan kata kunci "${searchTerm}"`
              : "Belum ada produk di katalog"}
          </p>
          <p className="text-xs text-gray-500 mt-0.5">
            Tambahkan produk melalui halaman &apos;Kelola Stok&apos;.
          </p>
        </div>
      ) : (
        <div className={`grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 ${isSidebarOpen ? 'xl:grid-cols-5' : 'xl:grid-cols-6'} gap-3 sm:gap-4 transition-all duration-300`}>
          {filteredProducts.map((product) => {
            const isLowStock = product.stock_quantity <= 5;

            return (
              <article
                key={product.id}
                className="group relative flex flex-col justify-between rounded-xl bg-white p-3 shadow-sm hover:shadow-md border border-gray-200 transition-all duration-200 hover:-translate-y-0.5"
              >
                <div>
                  <div className="relative aspect-square w-full overflow-hidden rounded-lg bg-gray-50 flex items-center justify-center border border-gray-100">
                    {product.image_url ? (
                      <Image
                        src={product.image_url}
                        alt={`Foto ${product.name}`}
                        fill
                        sizes="(max-width: 640px) 50vw, (max-width: 1024px) 25vw, 20vw"
                        className="object-cover transition-transform duration-300 group-hover:scale-105"
                      />
                    ) : (
                      <div className="flex flex-col items-center justify-center p-2 text-center">
                        <Package className="size-6 mb-1 text-terracotta-clay/70" />
                        <span className="text-[10px] font-bold uppercase tracking-wider text-terracotta-clay/80">
                          {product.category || "Hijab"}
                        </span>
                      </div>
                    )}

                    <div className="absolute bottom-2 right-2">
                      <span
                        className={`inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-[10px] font-bold shadow-sm backdrop-blur-sm ${
                          isLowStock
                            ? "bg-rose-600/95 text-white"
                            : "bg-terracotta-clay/90 text-white"
                        }`}
                      >
                        {isLowStock && <span className="size-1.5 rounded-full bg-white animate-pulse" />}
                        {product.stock_quantity} pcs
                      </span>
                    </div>

                    <div className="absolute top-2 left-2">
                      <span
                        className={`inline-flex items-center gap-1 rounded-full px-1.5 py-0.5 text-[9px] font-bold backdrop-blur-sm ${
                          product.is_active
                            ? "bg-emerald-500/90 text-white"
                            : "bg-slate-600/80 text-white"
                        }`}
                      >
                        <span className="size-1 rounded-full bg-white" />
                        {product.is_active ? "Aktif" : "Nonaktif"}
                      </span>
                    </div>
                  </div>

                  <div className="mt-2.5">
                    <span className="inline-block rounded-full bg-orange-50 border border-orange-200/60 px-2 py-0.5 text-[9px] font-bold uppercase tracking-wide text-terracotta-clay">
                      {product.category || "Hijab"}
                    </span>
                    <h3
                      className="mt-1 text-xs sm:text-sm font-bold text-gray-900 line-clamp-2 leading-tight min-h-[2rem]"
                      title={product.name}
                    >
                      {product.name}
                    </h3>
                    <p className="text-[10px] font-mono text-gray-400 mt-0.5 truncate">
                      {product.sku}
                    </p>
                  </div>
                </div>

                <div className="mt-2.5 pt-2 border-t border-gray-100">
                  <div className="flex items-baseline justify-between gap-1">
                    <div>
                      <span className="text-[10px] text-gray-400 block">Harga Jual</span>
                      <p className="text-xs sm:text-sm font-black text-terracotta-clay">
                        {formatRupiah(product.selling_price)}
                      </p>
                    </div>
                    {product.cost_price > 0 && (
                      <div className="text-right">
                        <span className="text-[9px] text-gray-400 block">Modal</span>
                        <p className="text-[10px] font-semibold text-gray-500">
                          {formatRupiah(product.cost_price)}
                        </p>
                      </div>
                    )}
                  </div>
                </div>
              </article>
            );
          })}
        </div>
      )}
    </div>
  );
}
