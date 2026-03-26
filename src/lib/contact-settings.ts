import { supabase } from "@/integrations/supabase/client";

export type ContactSettingsRow = {
  id: number;
  subtitle_uz: string;
  subtitle_tr: string;
  address_uz: string;
  address_tr: string;
  phone: string;
  email: string;
  working_hours_uz: string;
  working_hours_tr: string;
  whatsapp_url: string;
  telegram_url: string;
  instagram_url: string;
  facebook_url: string;
  created_at?: string;
  updated_at?: string;
};

export const DEFAULT_CONTACT_SETTINGS: ContactSettingsRow = {
  id: 1,
  subtitle_uz: "Biz bilan quyidagi aloqa kanallari orqali bog'laning",
  subtitle_tr: "Aşağıdaki iletişim kanallarından bize ulaşın",
  address_uz: "Molla Gürani Mah. Turgut Özal Millet Cad. Arslanbey Apt. No: 48. İç Kapı No: 15 Fatih İSTANBUL",
  address_tr: "Molla Gürani Mah. Turgut Özal Millet Cad. Arslanbey Apt. No: 48. İç Kapı No: 15 Fatih İSTANBUL",
  phone: "+90 542 124 7171 / +90 535 877 0171",
  email: "granteduagency.tr@gmail.com",
  working_hours_uz: "Dushanba - Shanba: 09:00 - 18:00",
  working_hours_tr: "Pazartesi - Cumartesi: 09:00 - 18:00",
  whatsapp_url: "https://wa.me/905421247171",
  telegram_url: "https://t.me/grantedu_uz",
  instagram_url: "https://instagram.com/grant.edu.agency",
  facebook_url: "",
};

export function mergeContactSettings(
  data?: Partial<ContactSettingsRow> | null,
): ContactSettingsRow {
  return {
    ...DEFAULT_CONTACT_SETTINGS,
    ...data,
    id: 1,
  };
}

export async function fetchContactSettings() {
  const { data, error } = await supabase
    .from("contact_settings")
    .select("*")
    .eq("id", 1)
    .maybeSingle();

  if (error) {
    throw error;
  }

  return mergeContactSettings(data as Partial<ContactSettingsRow> | null);
}

export function getLocalizedContactSettings(
  settings: ContactSettingsRow,
  language?: string | null,
) {
  const isUz = language?.startsWith("uz");

  return {
    subtitle: isUz ? settings.subtitle_uz : settings.subtitle_tr,
    address: isUz ? settings.address_uz : settings.address_tr,
    phone: settings.phone,
    email: settings.email,
    workingHours: isUz
      ? settings.working_hours_uz
      : settings.working_hours_tr,
    socialLinks: {
      whatsapp: settings.whatsapp_url,
      telegram: settings.telegram_url,
      instagram: settings.instagram_url,
      facebook: settings.facebook_url,
    },
  };
}
