// Utilitas Pemformatan Angka, Mata Uang, dan Tanggal

export const numberFormatter = new Intl.NumberFormat("id-ID");

export const currencyFormatter = new Intl.NumberFormat("id-ID", {
  style: "currency",
  currency: "IDR",
  maximumFractionDigits: 0,
});

export const dateFormatter = new Intl.DateTimeFormat("id-ID", {
  dateStyle: "medium",
  timeStyle: "short",
});

export function formatRupiah(amount: number | string | null | undefined): string {
  return currencyFormatter.format(Number(amount) || 0);
}

export function formatAngka(value: number | string | null | undefined): string {
  return numberFormatter.format(Number(value) || 0);
}

export function formatTanggal(date: string | Date | null | undefined): string {
  if (!date) return "-";
  return dateFormatter.format(new Date(date));
}

