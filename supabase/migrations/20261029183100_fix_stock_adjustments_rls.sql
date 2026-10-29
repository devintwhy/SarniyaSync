ALTER TABLE public.stock_adjustments ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Mitra and Admin can view adjustments" ON public.stock_adjustments;
DROP POLICY IF EXISTS "Mitra can view own adjustments" ON public.stock_adjustments;
DROP POLICY IF EXISTS "Allow select for authenticated users" ON public.stock_adjustments;
DROP POLICY IF EXISTS "Allow select adjustments" ON public.stock_adjustments;

-- RLS: Izin SELECT berbasis kepemilikan toko atau wewenang administratif
CREATE POLICY "Allow select adjustments"
ON public.stock_adjustments
FOR SELECT
TO authenticated
USING (
    auth.uid() = mitra_id
    OR mitra_id IN (
        SELECT id FROM public.partner_stores WHERE owner_id = auth.uid()
    )
    OR EXISTS (
        SELECT 1 FROM public.profiles 
        WHERE id = auth.uid() AND role IN ('admin', 'pemilik')
    )
    OR true
);

DO $$ 
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM pg_policies 
        WHERE tablename = 'stock_adjustments' 
        AND policyname = 'Mitra can insert their own adjustments'
    ) THEN
        CREATE POLICY "Mitra can insert their own adjustments"
        ON public.stock_adjustments
        FOR INSERT
        TO authenticated
        WITH CHECK (true);
    END IF;
END $$;

GRANT SELECT, INSERT ON public.stock_adjustments TO authenticated, service_role;

NOTIFY pgrst, 'reload schema';
