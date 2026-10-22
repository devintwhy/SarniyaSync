select table_name from information_schema.tables
where table_schema = 'public' and table_name = 'stock_transfers';

select policyname, cmd, roles, qual
from pg_policies
where tablename = 'stock_transfers';

select id, full_name, role from public.profiles limit 20;

select id, product_id, partner_store_id, quantity, status, sent_at
from public.stock_transfers
order by created_at desc
limit 20;

do $$
declare
  pol record;
begin
  for pol in
    select policyname from pg_policies where tablename = 'stock_transfers'
  loop
    execute format('drop policy if exists %I on public.stock_transfers', pol.policyname);
  end loop;
end$$;

alter table public.stock_transfers enable row level security;

-- Isolasi multi-tenant stock_transfers: Pengelola pusat (admin/pemilik) memegang kendali penuh alokasi barang,
-- sedangkan akun mitra dibatasi secara ketat hanya dapat melihat riwayat pengiriman yang ditujukan ke toko terdaftar milik mereka.
create policy "admin_pemilik_full_access"
on public.stock_transfers
for all
to authenticated
using (
  (select lower(role) from public.profiles where id = auth.uid())
  in ('admin', 'administrator', 'pemilik', 'pemilik_toko', 'owner')
)
with check (
  (select lower(role) from public.profiles where id = auth.uid())
  in ('admin', 'administrator', 'pemilik', 'pemilik_toko', 'owner')
);

create policy "partner_read_own_transfers"
on public.stock_transfers
for select
to authenticated
using (
  partner_store_id in (
    select id from public.partner_stores
    where owner_id = auth.uid()
  )
);

grant select, insert on public.stock_transfers to authenticated;
grant update (status, received_at, updated_at, notes) on public.stock_transfers to authenticated;

select policyname, cmd from pg_policies where tablename = 'stock_transfers';
