-- Migration: Allow admins and owners to update sales_transactions (for cancellation/status update)
grant update on table public.sales_transactions to authenticated;

drop policy if exists "Admins update sales transactions" on public.sales_transactions;
create policy "Admins update sales transactions"
on public.sales_transactions
for update
to authenticated
using (
  exists (
    select 1
    from public.profiles as profiles
    where profiles.id = (select auth.uid())
      and lower(profiles.role) in ('admin', 'administrator', 'pemilik', 'pemilik_toko', 'owner')
  )
)
with check (
  exists (
    select 1
    from public.profiles as profiles
    where profiles.id = (select auth.uid())
      and lower(profiles.role) in ('admin', 'administrator', 'pemilik', 'pemilik_toko', 'owner')
  )
);
