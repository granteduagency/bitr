import i18n from "@/i18n/config";
import { supabase } from "@/lib/supabase";

const SUPABASE_URL = import.meta.env.VITE_SUPABASE_URL;
const SUPABASE_PUBLISHABLE_KEY = import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY;

const readErrorCode = (payload: unknown) => {
  if (payload && typeof payload === "object") {
    const errorCode = (payload as { errorCode?: unknown }).errorCode;
    if (typeof errorCode === "string" && errorCode.trim()) {
      return errorCode;
    }
  }

  return "";
};

const readErrorMessage = (payload: unknown) => {
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

const translateAdminFunctionError = (message: string) => {
  const normalized = message.trim();

  const translations: Record<string, string> = {
    yetki_belirteci_yok: i18n.t("common.requestFailed"),
    yetkisiz: i18n.t("common.requestFailed"),
    admin_yetkisi_gerekli: i18n.t("common.requestFailed"),
    gecersiz_icerik: i18n.t("common.requestFailed"),
    openrouter_yanit_alinamadi: i18n.t("common.requestFailed"),
    ozet_uretilemedi: i18n.t("common.requestFailed"),
    desteklenmeyen_islem: i18n.t("common.requestFailed"),
    yontem_izin_verilmiyor: i18n.t("common.methodNotAllowed"),
    beklenmeyen_hata: i18n.t("common.requestFailed"),
  };

  return translations[normalized] || i18n.t("common.requestFailed");
};

const getAdminAccessToken = async (forceRefresh = false) => {
  const sessionResult = forceRefresh
    ? await supabase.auth.refreshSession()
    : await supabase.auth.getSession();

  const session = sessionResult.data.session;
  const token = session?.access_token?.trim();

  if (!token) {
    throw new Error(i18n.t("common.requestFailed"));
  }

  return token;
};

const executeAdminFunctionRequest = async (name: string, body: unknown, token: string) =>
  fetch(`${SUPABASE_URL}/functions/v1/${name}`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      apikey: SUPABASE_PUBLISHABLE_KEY,
      Authorization: `Bearer ${token}`,
    },
    body: JSON.stringify(body),
  });

export async function invokeAdminFunction<T>(name: string, body: unknown): Promise<T> {
  let response = await executeAdminFunctionRequest(
    name,
    body,
    await getAdminAccessToken(false),
  );

  if (response.status === 401) {
    response = await executeAdminFunctionRequest(
      name,
      body,
      await getAdminAccessToken(true),
    );
  }

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
    const message =
      readErrorCode(payload) ||
      readErrorMessage(payload) ||
      i18n.t("common.requestFailed");
    throw new Error(translateAdminFunctionError(message));
  }

  return payload as T;
}
