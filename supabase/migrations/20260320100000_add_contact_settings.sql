create table if not exists public.contact_settings (
  id integer primary key default 1 check (id = 1),
  subtitle_uz text not null default 'Biz bilan bog''laning',
  subtitle_tr text not null default 'Bizimle iletişime geçin',
  address_uz text not null default 'Istanbul, Turkiya',
  address_tr text not null default 'İstanbul, Türkiye',
  phone text not null default '+90 212 XXX XX XX',
  email text not null default 'info@viza.com',
  working_hours_uz text not null default 'Dushanba - Shanba: 09:00 - 18:00',
  working_hours_tr text not null default 'Pazartesi - Cumartesi: 09:00 - 18:00',
  whatsapp_url text not null default '',
  telegram_url text not null default '',
  instagram_url text not null default '',
  facebook_url text not null default '',
  created_at timestamp with time zone not null default now(),
  updated_at timestamp with time zone not null default now()
);

alter table public.contact_settings enable row level security;

create or replace function public.set_contact_settings_updated_at()
returns trigger
language plpgsql
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

drop trigger if exists contact_settings_updated_at on public.contact_settings;
create trigger contact_settings_updated_at
before update on public.contact_settings
for each row
execute function public.set_contact_settings_updated_at();

insert into public.contact_settings (
  id,
  subtitle_uz,
  subtitle_tr,
  address_uz,
  address_tr,
  phone,
  email,
  working_hours_uz,
  working_hours_tr
)
values (
  1,
  'Biz bilan bog''laning',
  'Bizimle iletişime geçin',
  'Istanbul, Turkiya',
  'İstanbul, Türkiye',
  '+90 212 XXX XX XX',
  'info@viza.com',
  'Dushanba - Shanba: 09:00 - 18:00',
  'Pazartesi - Cumartesi: 09:00 - 18:00'
)
on conflict (id) do nothing;

create policy "Public can read contact settings"
on public.contact_settings
for select
using (true);

create policy "Admins can manage contact settings"
on public.contact_settings
for all
using (public.has_role(auth.uid(), 'admin'))
with check (public.has_role(auth.uid(), 'admin'));
