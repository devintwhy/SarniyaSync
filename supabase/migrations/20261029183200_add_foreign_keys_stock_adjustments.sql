ALTER TABLE public.stock_adjustments
    DROP CONSTRAINT IF EXISTS fk_stock_adjustments_product,
    DROP CONSTRAINT IF EXISTS stock_adjustments_product_id_fkey,
    DROP CONSTRAINT IF EXISTS fk_stock_adjustments_mitra,
    DROP CONSTRAINT IF EXISTS stock_adjustments_mitra_id_fkey;

-- Relasi foreign key untuk join kueri PostgREST products(name, sku, cost_price)
ALTER TABLE public.stock_adjustments
    ADD CONSTRAINT stock_adjustments_product_id_fkey
    FOREIGN KEY (product_id)
    REFERENCES public.products(id)
    ON DELETE CASCADE;

ALTER TABLE public.stock_adjustments
    ADD CONSTRAINT stock_adjustments_mitra_id_fkey
    FOREIGN KEY (mitra_id)
    REFERENCES auth.users(id)
    ON DELETE CASCADE;

CREATE INDEX IF NOT EXISTS idx_stock_adjustments_product_fk ON public.stock_adjustments(product_id);
CREATE INDEX IF NOT EXISTS idx_stock_adjustments_mitra_fk ON public.stock_adjustments(mitra_id);

GRANT ALL ON public.stock_adjustments TO authenticated, service_role;

NOTIFY pgrst, 'reload schema';
