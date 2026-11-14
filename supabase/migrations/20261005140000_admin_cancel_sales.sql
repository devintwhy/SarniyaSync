grant delete on table public.sales_transactions to authenticated;

drop policy if exists "Admins delete sales transactions" on public.sales_transactions;
create policy "Admins delete sales transactions"
on public.sales_transactions
for delete
to authenticated
using (
  public.current_app_role() in ('admin', 'administrator', 'pemilik', 'pemilik_toko', 'owner')
);