-- Penguatan Kebijakan RLS Tabel Penyesuaian Stok (stock_adjustments)
-- Memastikan seluruh kebijakan lama yang berpotensi membuka akses terlalu luas dihapus secara tuntas.

ALTER TABLE public.stock_adjustments ENABLE ROW LEVEL SECURITY;

-- 1. Hapus seluruh kebijakan lama dan variasi nama sebelumnya
DROP POLICY IF EXISTS "Allow select adjustments" ON public.stock_adjustments;
DROP POLICY IF EXISTS "Mitra can insert their own adjustments" ON public.stock_adjustments;
DROP POLICY IF EXISTS "Mitra and Admin can view adjustments" ON public.stock_adjustments;
DROP POLICY IF EXISTS "Mitra can view own adjustments" ON public.stock_adjustments;
DROP POLICY IF EXISTS "Allow select for authenticated users" ON public.stock_adjustments;
DROP POLICY IF EXISTS "stock_adjustments_select_policy" ON public.stock_adjustments;
DROP POLICY IF EXISTS "stock_adjustments_insert_policy" ON public.stock_adjustments;
DROP POLICY IF EXISTS "stock_adjustments_delete_policy" ON public.stock_adjustments;

-- 2. Kebijakan SELECT: Mitra hanya dapat melihat data tokonya sendiri; Admin dan Pemilik dapat melihat seluruh data
CREATE POLICY "stock_adjustments_select_policy"
ON public.stock_adjustments
FOR SELECT
TO authenticated
USING (
    mitra_id = auth.uid()
    OR EXISTS (
        SELECT 1 FROM public.partner_stores
        WHERE partner_stores.id = stock_adjustments.mitra_id
        AND partner_stores.owner_id = auth.uid()
    )
    OR EXISTS (
        SELECT 1 FROM public.profiles
        WHERE profiles.id = auth.uid()
        AND profiles.role IN ('admin', 'pemilik')
    )
);

-- 3. Kebijakan INSERT: Mitra hanya dapat menambahkan data untuk tokonya sendiri; Admin dan Pemilik memiliki wewenang penuh
CREATE POLICY "stock_adjustments_insert_policy"
ON public.stock_adjustments
FOR INSERT
TO authenticated
WITH CHECK (
    mitra_id = auth.uid()
    OR EXISTS (
        SELECT 1 FROM public.partner_stores
        WHERE partner_stores.id = stock_adjustments.mitra_id
        AND partner_stores.owner_id = auth.uid()
    )
    OR EXISTS (
        SELECT 1 FROM public.profiles
        WHERE profiles.id = auth.uid()
        AND profiles.role IN ('admin', 'pemilik')
    )
);

-- 4. Kebijakan DELETE: Hanya Admin dan Pemilik yang berwenang menghapus riwayat penyesuaian stok
CREATE POLICY "stock_adjustments_delete_policy"
ON public.stock_adjustments
FOR DELETE
TO authenticated
USING (
    EXISTS (
        SELECT 1 FROM public.profiles
        WHERE profiles.id = auth.uid()
        AND profiles.role IN ('admin', 'pemilik')
    )
);

GRANT SELECT, INSERT ON public.stock_adjustments TO authenticated, service_role;
GRANT DELETE ON public.stock_adjustments TO authenticated, service_role;

NOTIFY pgrst, 'reload schema';

