import i18n from '@/i18n/config';

const SUPABASE_URL = import.meta.env.VITE_SUPABASE_URL;
const SUPABASE_PUBLISHABLE_KEY = import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY;

const readFunctionErrorCode = (payload: unknown) => {
  if (payload && typeof payload === "object") {
    const errorCode = (payload as { errorCode?: unknown }).errorCode;

    if (typeof errorCode === "string" && errorCode.trim()) {
      return errorCode;
    }
  }

  return "";
};

const readFunctionError = (payload: unknown) => {
  if (typeof payload === "string" && payload.trim()) {
    return payload;
  }

  if (payload && typeof payload === "object") {
    const message = (payload as { message?: unknown }).message;
    const error = (payload as { error?: unknown }).error;

    if (typeof message === "string" && message.trim()) {
      return message;
    }

    if (typeof error === "string" && error.trim()) {
      return error;
    }
  }

  return "";
};

const translateFunctionError = (message: string) => {
  const normalized = message.trim();

  const translations: Record<string, string> = {
    pasaport_gecersiz_belge:
      i18n.t('form.passportValidation.invalid'),
    pasaport_dosyasi_eksik:
      i18n.t('common.fileReadError'),
    orijinal_belge_baglantisi_yok:
      i18n.t('common.originalDocumentUnavailable'),
    randevu_dosyasi_okunamadi:
      i18n.t('common.appointmentFileReadError'),
    yetki_belirteci_yok:
      i18n.t('common.requestFailed'),
    yetkisiz:
      i18n.t('common.requestFailed'),
    admin_yetkisi_gerekli:
      i18n.t('common.requestFailed'),
    desteklenmeyen_islem:
      i18n.t('common.requestFailed'),
    yontem_izin_verilmiyor:
      i18n.t('common.methodNotAllowed'),
    beklenmeyen_hata:
      i18n.t('common.requestFailed'),
    randevu_dosyasi_eksik:
      i18n.t('common.fileReadError'),
    randevu_dosyasi_cok_buyuk:
      i18n.t('common.fileTooLarge'),
    yalniz_pdf_veya_gorsel:
      i18n.t('common.onlyPdfOrImage'),
    kayit_ve_belge_numarasi_gerekli:
      i18n.t('ikamet.registrationAndDocumentRequired'),
    gecersiz_kontrol_turu:
      i18n.t('ikamet.invalidCheckType'),
    gecerli_telefon_gerekli:
      i18n.t('ikamet.phoneRequiredForCheck'),
    gecerli_eposta_gerekli:
      i18n.t('ikamet.emailRequiredForCheck'),
    doviz_kuru_alinamadi:
      i18n.t('deport.exchangeRateUnavailable'),
    tcmb_verisi_gecersiz:
      i18n.t('deport.exchangeRateUnavailable'),
    usd_kuru_bulunamadi:
      i18n.t('deport.exchangeRateUnavailable'),
  };

  return translations[normalized] || i18n.t('common.requestFailed');
};

const translateHttpStatusError = (status: number) => {
  if (status >= 500) {
    const translations: Record<number, string> = {
      500: i18n.t('common.serverError'),
      502: i18n.t('common.badGateway'),
      503: i18n.t('common.serviceUnavailable'),
      504: i18n.t('common.gatewayTimeout'),
    };

    return translations[status] || i18n.t('common.serverError');
  }

  if (status === 405) {
    return i18n.t('common.methodNotAllowed');
  }

  return i18n.t('common.requestFailed');
};

export async function invokePublicFunction<T>(name: string, body: unknown): Promise<T> {
  const response = await fetch(`${SUPABASE_URL}/functions/v1/${name}`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      apikey: SUPABASE_PUBLISHABLE_KEY,
      Authorization: `Bearer ${SUPABASE_PUBLISHABLE_KEY}`,
    },
    body: JSON.stringify(body),
  });

  const raw = await response.text();
  let payload: unknown = null;

  if (raw) {
    try {
      payload = JSON.parse(raw);
    } catch {
      payload = raw;
    }
  }

  if (!response.ok) {
    const errorCode = readFunctionErrorCode(payload);
    const message = errorCode || readFunctionError(payload) || translateHttpStatusError(response.status);
    throw new Error(translateFunctionError(message));
  }

  return payload as T;
}
