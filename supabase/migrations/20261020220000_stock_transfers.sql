create table if not exists public.stock_transfers (
  id            uuid primary key default gen_random_uuid(),
  product_id    uuid not null references public.products(id) on delete restrict,
  partner_store_id uuid not null references public.partner_stores(id) on delete restrict,
  quantity      integer not null check (quantity > 0),
  status        text not null default 'DIKIRIM'
                  check (status in ('DIKIRIM', 'DITERIMA', 'DIBATALKAN')),
  created_by    uuid references auth.users(id) on delete set null,
  notes         text,
  sent_at       timestamptz not null default now(),
  received_at   timestamptz,
  created_at    timestamptz not null default now(),
  updated_at    timestamptz not null default now()
);

create index if not exists idx_stock_transfers_store_status
  on public.stock_transfers(partner_store_id, status);

create index if not exists idx_stock_transfers_product
  on public.stock_transfers(product_id);

alter table public.stock_transfers enable row level security;

-- Kebijakan isolasi multi-tenant stock_transfers:
-- 1. Akun mitra dibatasi hanya dapat membaca kiriman yang ditujukan ke toko aktif miliknya.
-- 2. Administrator dan pemilik memiliki otorisasi penuh membaca serta memutasi data pengiriman pusat.
drop policy if exists "Partners read their transfers" on public.stock_transfers;
create policy "Partners read their transfers"
on public.stock_transfers
for select
to authenticated
using (
  exists (
    select 1
    from public.partner_stores as ps
    where ps.id = stock_transfers.partner_store_id
      and ps.owner_id = (select auth.uid())
  )
);

drop policy if exists "Admins manage stock transfers" on public.stock_transfers;
create policy "Admins manage stock transfers"
on public.stock_transfers
for all
to authenticated
using (
  exists (
    select 1
    from public.profiles as p
    where p.id = (select auth.uid())
      and lower(p.role) in ('admin', 'administrator', 'pemilik', 'pemilik_toko', 'owner')
  )
)
with check (
  exists (
    select 1
    from public.profiles as p
    where p.id = (select auth.uid())
      and lower(p.role) in ('admin', 'administrator', 'pemilik', 'pemilik_toko', 'owner')
  )
);

grant select, insert on table public.stock_transfers to authenticated;
grant update (status, received_at, updated_at) on table public.stock_transfers to authenticated;

-- Prosedur atomik penerimaan paket barang oleh mitra:
-- Menjamin verifikasi kepemilikan toko dan transisi status kiriman bersamaan dengan pembaruan stok inventaris toko mitra.
create or replace function public.receive_stock_transfer(p_transfer_id uuid)
returns jsonb
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_user_id       uuid := auth.uid();
  v_transfer      record;
  v_store         record;
  v_existing_inv  record;
begin
  if v_user_id is null then
    raise exception 'Authentication required' using errcode = '42501';
  end if;

  select st.id, st.product_id, st.partner_store_id, st.quantity, st.status
  into v_transfer
  from public.stock_transfers as st
  where st.id = p_transfer_id;

  if not found then
    raise exception 'Kiriman tidak ditemukan' using errcode = 'P0002';
  end if;

  select ps.id, ps.owner_id
  into v_store
  from public.partner_stores as ps
  where ps.id = v_transfer.partner_store_id
    and ps.owner_id = v_user_id;

  if not found then
    raise exception 'Anda tidak berhak menerima kiriman ini' using errcode = '42501';
  end if;

  if v_transfer.status <> 'DIKIRIM' then
    raise exception 'Status kiriman bukan DIKIRIM (saat ini: %)', v_transfer.status
      using errcode = 'P0003';
  end if;

  update public.stock_transfers
  set
    status      = 'DITERIMA',
    received_at = now(),
    updated_at  = now()
  where id = v_transfer.id;

  select id, stock_quantity
  into v_existing_inv
  from public.partner_store_inventory
  where partner_store_id = v_transfer.partner_store_id
    and product_id = v_transfer.product_id;

  if found then
    update public.partner_store_inventory
    set
      stock_quantity = v_existing_inv.stock_quantity + v_transfer.quantity,
      updated_at     = now()
    where id = v_existing_inv.id;
  else
    insert into public.partner_store_inventory (partner_store_id, product_id, stock_quantity)
    values (v_transfer.partner_store_id, v_transfer.product_id, v_transfer.quantity);
  end if;

  return jsonb_build_object(
    'success',    true,
    'transferId', p_transfer_id,
    'quantity',   v_transfer.quantity
  );
end;
$$;

revoke all on function public.receive_stock_transfer(uuid) from public, anon;
grant execute on function public.receive_stock_transfer(uuid) to authenticated;
