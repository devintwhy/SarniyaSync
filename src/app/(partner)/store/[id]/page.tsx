type StorePageProps = {
  params: {
    id: string;
  };
};

export default function StoreReportPage({ params }: StorePageProps) {
  return (
    <div className="mx-auto max-w-7xl px-5 py-8 sm:px-8 lg:px-10 lg:py-10">
      <p className="mb-2 text-sm font-medium text-[#557b64]">Area Mitra Toko Offline</p>
      <h1 className="text-3xl font-semibold tracking-tight text-[#173b32]">
        Laporan Penjualan Toko ID: {params.id}
      </h1>
    </div>
  );
}