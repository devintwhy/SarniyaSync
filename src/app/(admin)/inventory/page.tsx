"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import Image from "next/image";

type Product = Record<string, unknown>;

type ProductsResponse = {
  products?: Product[];
  error?: string;
};

type ProductActionResponse = {
  error?: string;
};

async function fetchProducts(search: string, category: string, signal?: AbortSignal) {
  const params = new URLSearchParams();
  if (search) params.set("search", search);
  if (category && category !== "all") params.set("category", category);
  const query = params.toString();
  const response = await fetch(`/api/products${query ? `?${query}` : ""}`, signal ? { signal } : undefined);
  const result = (await response.json()) as ProductsResponse;

  if (!response.ok) {
    throw new Error(result.error ?? "Produk gagal dimuat.");
  }

  return result.products ?? [];
}

function getText(product: Product, fields: string[], fallback = "-") {
  for (const field of fields) {
    const value = product[field];
    if (typeof value === "string" || typeof value === "number") {
      return String(value);
    }
  }

  return fallback;
}

function getStock(product: Product) {
  for (const field of ["stock_quantity", "stock", "stok", "quantity", "jumlah_stok"]) {
    const value = product[field];
    if (typeof value === "number" || typeof value === "string") {
      const stock = Number(value);
      if (Number.isFinite(stock)) return stock;
    }
  }

  return null;
}

type InventoryPageProps = {
  searchParams?: {
    search?: string | string[];
    category?: string | string[];
  };
};

export default function InventoryPage({ searchParams = {} }: InventoryPageProps) {
  const search = typeof searchParams.search === "string" ? searchParams.search : "";
  const category = typeof searchParams.category === "string" ? searchParams.category : "all";
  const [products, setProducts] = useState<Product[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [errorMessage, setErrorMessage] = useState("");
  const [successMessage, setSuccessMessage] = useState("");
  const [actionError, setActionError] = useState("");
  const [deletingId, setDeletingId] = useState("");

  useEffect(() => {
    const notifications = [
      ["inventory-product-added", "Produk berhasil ditambahkan."],
      ["inventory-product-updated", "Produk berhasil diperbarui."],
    ] as const;

    for (const [key, message] of notifications) {
      if (window.sessionStorage.getItem(key) === "true") {
        window.sessionStorage.removeItem(key);
        setSuccessMessage(message);
        break;
      }
    }
  }, []);

  useEffect(() => {
    const controller = new AbortController();

    async function loadProducts() {
      setIsLoading(true);
      setErrorMessage("");
      try {
        setProducts(await fetchProducts(search, category, controller.signal));
      } catch (error) {
        if (error instanceof Error && error.name === "AbortError") return;
        setErrorMessage(
          error instanceof Error ? error.message : "Terjadi kesalahan saat memuat produk.",
        );
      } finally {
        if (!controller.signal.aborted) setIsLoading(false);
      }
    }

    void loadProducts();
    return () => controller.abort();
  }, [search, category]);

  async function handleDelete(product: Product) {
    const productId = getText(product, ["id"], "");
    const productName = getText(product, ["name"], "produk ini");
    if (!productId || !window.confirm(`Yakin ingin menghapus produk "${productName}"?`)) return;

    setDeletingId(productId);
    setActionError("");
    setSuccessMessage("");

    try {
      const response = await fetch(`/api/products/${encodeURIComponent(productId)}`, {
        method: "DELETE",
      });
      const result = (await response.json()) as ProductActionResponse;

      if (!response.ok) {
        throw new Error(result.error ?? "Produk gagal dihapus.");
      }

      setProducts(await fetchProducts(search, category));
      setSuccessMessage("Produk berhasil dihapus.");
    } catch (error) {
      setActionError(error instanceof Error ? error.message : "Produk gagal dihapus.");
    } finally {
      setDeletingId("");
    }
  }

  return (
    <div className="mx-auto max-w-7xl px-5 py-8 sm:px-8 lg:px-10 lg:py-10">
      <header className="mb-8 flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <p className="mb-2 text-sm font-medium text-[#557b64]">Area Owner</p>
          <h1 className="text-3xl font-semibold tracking-tight text-[#173b32]">Kelola Stok</h1>
          <p className="mt-2 text-sm text-[#68756e]">Daftar produk dan ketersediaan stok.</p>
        </div>
        <div className="flex items-center justify-between gap-4 sm:justify-end">
          <p className="text-sm text-[#68756e]" aria-live="polite">
            {isLoading ? "Memuat produk..." : `${products.length} produk`}
          </p>
          <Link
            href="/inventory/tambah"
            className="inline-flex min-h-10 items-center justify-center rounded-md bg-[#285b46] px-4 py-2 text-sm font-medium text-white transition-colors hover:bg-[#1f4938] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#6e9a75] focus-visible:ring-offset-2"
          >
            Tambah Produk
          </Link>
        </div>
      </header>

      {successMessage && (
        <div
          role="status"
          className="mb-5 flex items-center justify-between gap-4 rounded-md border border-[#cfe2d0] bg-[#edf5e8] px-4 py-3 text-sm text-[#315d3e]"
        >
          <p>{successMessage}</p>
          <button
            type="button"
            onClick={() => setSuccessMessage("")}
            className="font-medium underline underline-offset-2 hover:text-[#173b32]"
          >
            Tutup
          </button>
        </div>
      )}
      {actionError && (
        <p role="alert" className="mb-5 rounded-md border border-[#f0d4cc] bg-[#fff5f1] px-4 py-3 text-sm text-[#9b4936]">
          {actionError}
        </p>
      )}

      <form
        action="/inventory"
        method="get"
        className="mb-5 flex flex-col gap-3 rounded-md border border-[#e1e7e0] bg-white p-4 sm:flex-row sm:items-end"
      >
        <div className="min-w-0 flex-1">
          <label htmlFor="inventory-search" className="mb-1.5 block text-xs font-medium text-[#52645a]">
            Cari nama produk atau SKU
          </label>
          <input
            id="inventory-search"
            name="search"
            type="search"
            defaultValue={search}
            placeholder="Contoh: Pashmina atau HJ-001"
            className="min-h-10 w-full rounded-md border border-[#d9e1d9] px-3 text-sm text-[#293a32] outline-none focus:border-[#6e9a75] focus:ring-2 focus:ring-[#6e9a75]/20"
          />
        </div>
        <div className="sm:w-52">
          <label htmlFor="inventory-category" className="mb-1.5 block text-xs font-medium text-[#52645a]">
            Kategori
          </label>
          <select
            id="inventory-category"
            name="category"
            defaultValue={category || "all"}
            className="min-h-10 w-full rounded-md border border-[#d9e1d9] bg-white px-3 text-sm text-[#293a32] outline-none focus:border-[#6e9a75] focus:ring-2 focus:ring-[#6e9a75]/20"
          >
            <option value="all">Semua kategori</option>
            <option value="Pashmina">Pashmina</option>
            <option value="Segi empat">Segi empat</option>
            <option value="Bergo">Bergo</option>
          </select>
        </div>
        <button
          type="submit"
          className="inline-flex min-h-10 items-center justify-center rounded-md bg-[#285b46] px-4 text-sm font-medium text-white transition-colors hover:bg-[#1f4938] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#6e9a75] focus-visible:ring-offset-2"
        >
          Cari
        </button>
      </form>

      <section aria-label="Daftar produk" className="overflow-hidden rounded-md border border-[#e1e7e0] bg-white shadow-sm shadow-[#173b32]/5">
        <div className="border-b border-[#edf0ec] px-5 py-4">
          <h2 className="font-semibold text-[#173b32]">Inventaris produk</h2>
          <p className="mt-1 text-sm text-[#7b877f]">Data diperbarui dari katalog SarniyaSync.</p>
        </div>

        {isLoading ? (
          <div className="px-5 py-12 text-center text-sm text-[#68756e]" role="status">
            Memuat data produk...
          </div>
        ) : (
          <>
            {!isLoading && errorMessage && (
              <div
                role="alert"
                className="border-b border-[#f1dfc5] bg-[#fff9ef] px-5 py-3 text-sm text-[#765a36]"
              >
                Produk gagal dimuat dari Supabase: {errorMessage}
              </div>
            )}
            {!isLoading && !errorMessage && products.length === 0 && (
              <div role="status" className="border-b border-[#edf0ec] px-5 py-6 text-center text-sm text-[#68756e]">
                Belum ada produk di inventaris.
              </div>
            )}
          <div className="overflow-x-auto">
            <table className="w-full min-w-[720px] text-left text-sm">
              <thead className="bg-[#f7f9f6] text-xs uppercase tracking-wide text-[#68756e]">
                <tr>
                  <th scope="col" className="px-5 py-3 font-medium">SKU</th>
                  <th scope="col" className="px-5 py-3 font-medium">Nama produk</th>
                  <th scope="col" className="px-5 py-3 font-medium">Kategori</th>
                  <th scope="col" className="px-5 py-3 text-right font-medium">Stok</th>
                  <th scope="col" className="px-5 py-3 text-right font-medium">Harga</th>
                  <th scope="col" className="px-5 py-3 font-medium">Aksi</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-[#edf0ec]">
                {products.map((product, index) => {
                  const stock = getStock(product);
                  const productName = getText(product, ["name", "nama", "nama_produk", "product_name"]);
                  const imageUrl = getText(product, ["image_url"], "");

                  return (
                    <tr key={getText(product, ["id", "sku", "kode_produk"], String(index))} className="transition-colors hover:bg-[#fafbf9]">
                      <td className="whitespace-nowrap px-5 py-4 text-xs text-[#7b877f]">
                        {getText(product, ["sku", "code", "kode_produk", "id"])}
                      </td>
                      <th scope="row" className="whitespace-nowrap px-5 py-4 font-medium text-[#293a32]">
                        <div className="flex items-center gap-3">
                          {imageUrl ? (
                            <Image
                              src={imageUrl}
                              alt={`Foto ${productName}`}
                              width={44}
                              height={44}
                              sizes="44px"
                              className="size-11 shrink-0 rounded border border-[#e1e7e0] object-cover"
                            />
                          ) : (
                            <span
                              aria-hidden="true"
                              className="flex size-11 shrink-0 items-center justify-center rounded border border-[#e1e7e0] bg-[#f7f9f6] text-[10px] font-medium text-[#7b877f]"
                            >
                              Foto
                            </span>
                          )}
                          <span>{productName}</span>
                        </div>
                      </th>
                      <td className="whitespace-nowrap px-5 py-4 text-[#68756e]">
                        {getText(product, ["category", "kategori", "jenis"], "Hijab")}
                      </td>
                      <td className="whitespace-nowrap px-5 py-4 text-right font-medium text-[#293a32]">
                        {stock ?? "-"} <span className="font-normal text-[#7b877f]">{getText(product, ["unit", "satuan"], "pcs")}</span>
                      </td>
                      <td className="whitespace-nowrap px-5 py-4 text-right text-[#293a32]">
                        {getText(product, ["selling_price", "price", "harga_jual"], "-")}
                      </td>
                      <td className="whitespace-nowrap px-5 py-4">
                        <div className="flex items-center gap-2">
                          <Link
                            href={`/inventory/edit/${encodeURIComponent(getText(product, ["id"], ""))}`}
                            aria-label={`Edit ${productName}`}
                            className="rounded border border-[#d9e1d9] px-2.5 py-1.5 text-xs font-medium text-[#52645a] transition-colors hover:bg-[#f7f9f6] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#6e9a75]"
                          >
                            Edit
                          </Link>
                          <button
                            type="button"
                            onClick={() => void handleDelete(product)}
                            disabled={deletingId === getText(product, ["id"], "")}
                            aria-label={`Hapus ${productName}`}
                            className="rounded border border-[#ead5cf] px-2.5 py-1.5 text-xs font-medium text-[#9b4936] opacity-60"
                          >
                            {deletingId === getText(product, ["id"], "") ? "Menghapus..." : "Hapus"}
                          </button>
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
          </>
        )}
      </section>
    </div>
  );
}