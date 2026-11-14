DROP FUNCTION IF EXISTS public.adjust_physical_stock CASCADE;
DROP FUNCTION IF EXISTS public.adjust_physical_stock(UUID, UUID, INT, VARCHAR, TEXT);
DROP FUNCTION IF EXISTS public.adjust_physical_stock(UUID, UUID, INTEGER, TEXT, TEXT);

CREATE OR REPLACE FUNCTION public.adjust_physical_stock(
    p_mitra_id UUID,
    p_product_id UUID,
    p_qty_changed INTEGER,
    p_reason TEXT,
    p_notes TEXT DEFAULT ''
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
    v_target_store_id UUID;
    v_user_id UUID;
    v_new_stock INT;
    v_adjustment_id UUID;
BEGIN
    IF p_qty_changed >= 0 THEN
        RAISE EXCEPTION 'Jumlah penyesuaian untuk kerugian/hilang/rusak harus bernilai negatif.';
    END IF;

    -- Pemetaan identitas cabang: resolusi store_id dan owner_id dari relasi partner_stores
    SELECT id, owner_id INTO v_target_store_id, v_user_id
    FROM public.partner_stores
    WHERE id = p_mitra_id OR owner_id = p_mitra_id
    LIMIT 1;

    IF v_target_store_id IS NULL THEN
        v_target_store_id := p_mitra_id;
        v_user_id := p_mitra_id;
    END IF;

    INSERT INTO public.stock_adjustments (
        mitra_id,
        product_id,
        quantity_changed,
        reason,
        notes,
        created_at
    )
    VALUES (
        v_user_id,
        p_product_id,
        p_qty_changed,
        p_reason,
        COALESCE(p_notes, ''),
        timezone('utc'::text, now())
    )
    RETURNING id INTO v_adjustment_id;

    -- Pengurangan stok fisik cabang secara atomik
    UPDATE public.partner_store_inventory
    SET 
        stock_quantity = stock_quantity + p_qty_changed,
        updated_at = timezone('utc'::text, now())
    WHERE partner_store_id = v_target_store_id
      AND product_id = p_product_id
    RETURNING stock_quantity INTO v_new_stock;

    IF NOT FOUND THEN
        RAISE EXCEPTION 'Data produk tidak ditemukan di inventaris toko mitra ini (partner_store_id: %).', v_target_store_id;
    END IF;

    IF v_new_stock < 0 THEN
        RAISE EXCEPTION 'Penyesuaian dibatalkan: sisa stok tidak mencukupi untuk dikurangi.';
    END IF;

    RETURN jsonb_build_object(
        'success', true,
        'adjustment_id', v_adjustment_id,
        'new_stock', v_new_stock
    );
EXCEPTION
    WHEN OTHERS THEN
        RAISE EXCEPTION '%', SQLERRM;
END;
$$;

GRANT EXECUTE ON FUNCTION public.adjust_physical_stock(UUID, UUID, INTEGER, TEXT, TEXT) TO authenticated, service_role, anon;

NOTIFY pgrst, 'reload schema';
