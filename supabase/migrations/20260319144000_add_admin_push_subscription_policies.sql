create policy "Admins can view their push subscriptions"
on public.admin_push_subscriptions
for select
using (auth.uid() = user_id and public.has_role(auth.uid(), 'admin'));

create policy "Admins can manage their push subscriptions"
on public.admin_push_subscriptions
for all
using (auth.uid() = user_id and public.has_role(auth.uid(), 'admin'))
with check (auth.uid() = user_id and public.has_role(auth.uid(), 'admin'));
