insert into public.contact_settings (
  id,
  subtitle_uz,
  subtitle_tr,
  address_uz,
  address_tr,
  phone,
  email,
  working_hours_uz,
  working_hours_tr,
  whatsapp_url,
  telegram_url,
  instagram_url,
  facebook_url
)
values (
  1,
  'Biz bilan quyidagi aloqa kanallari orqali bog''laning',
  'Aşağıdaki iletişim kanallarından bize ulaşın',
  'Molla Gürani Mah. Turgut Özal Millet Cad. Arslanbey Apt. No: 48. İç Kapı No: 15 Fatih İSTANBUL',
  'Molla Gürani Mah. Turgut Özal Millet Cad. Arslanbey Apt. No: 48. İç Kapı No: 15 Fatih İSTANBUL',
  '+90 542 124 7171 / +90 535 877 0171',
  'granteduagency.tr@gmail.com',
  'Dushanba - Shanba: 09:00 - 18:00',
  'Pazartesi - Cumartesi: 09:00 - 18:00',
  'https://wa.me/905421247171',
  'https://t.me/grantedu_uz',
  'https://instagram.com/grant.edu.agency',
  ''
)
on conflict (id) do update
set
  subtitle_uz = excluded.subtitle_uz,
  subtitle_tr = excluded.subtitle_tr,
  address_uz = excluded.address_uz,
  address_tr = excluded.address_tr,
  phone = excluded.phone,
  email = excluded.email,
  working_hours_uz = excluded.working_hours_uz,
  working_hours_tr = excluded.working_hours_tr,
  whatsapp_url = excluded.whatsapp_url,
  telegram_url = excluded.telegram_url,
  instagram_url = excluded.instagram_url,
  facebook_url = excluded.facebook_url;
