"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { cancelPartnerSale } from "./actions";

type CancelSaleButtonProps = {
  transactionId: string;
  transactionNumber: string;
};

export default function CancelSaleButton({ transactionId, transactionNumber }: CancelSaleButtonProps) {
  const router = useRouter();
  const [isCancelling, setIsCancelling] = useState(false);
  const [errorMessage, setErrorMessage] = useState("");

  async function handleCancel() {
    if (!window.confirm(`Batalkan transaksi ${transactionNumber}? Stok akan dikembalikan ke toko.`)) return;

    setIsCancelling(true);
    setErrorMessage("");
    try {
      const result = await cancelPartnerSale(transactionId);
      if (result.error) throw new Error(result.error);
      router.refresh();
    } catch (error) {
      setErrorMessage(error instanceof Error ? error.message : "Pembatalan transaksi gagal.");
    } finally {
      setIsCancelling(false);
    }
  }

  return (
    <div className="flex flex-col items-end gap-1">
      <button
        type="button"
        onClick={() => void handleCancel()}
        disabled={isCancelling}
        className="rounded border border-[#ead5cf] px-2.5 py-1.5 text-xs font-medium text-[#9b4936] transition-colors hover:bg-[#fff5f1] disabled:cursor-not-allowed disabled:opacity-60"
      >
        {isCancelling ? "Memproses..." : "Batalkan"}
      </button>
      {errorMessage && <span role="alert" className="max-w-48 text-right text-xs text-[#9b4936]">{errorMessage}</span>}
    </div>
  );
}