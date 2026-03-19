import { supabase } from "@/lib/supabase";
import {
  getDefaultClientPhoneCountry,
  normalizeClientName,
  toStoredClientPhone,
  validateClientName,
  validateClientPhone,
  type ClientPhoneCountry,
} from "@/lib/client-entry";

export type ClientServiceKey =
  | "dashboard"
  | "ikamet"
  | "sigorta"
  | "visa"
  | "calisma"
  | "tercume"
  | "hukuk"
  | "universite"
  | "deport"
  | "konsolosluk"
  | "iletisim";

type StoredClientIdentity = {
  name: string;
  phone: string;
  country: ClientPhoneCountry;
};

type ActivityOptions = {
  route?: string | null;
  serviceKey?: ClientServiceKey | null;
  action: string;
  details?: Record<string, unknown>;
  referenceId?: string | null;
  throttleKey?: string;
  throttleMs?: number;
};

type ApplicationOptions = {
  route?: string | null;
  serviceKey: ClientServiceKey;
  referenceId: string;
  details?: Record<string, unknown>;
};

const CLIENT_NAME_KEY = "client_name";
const CLIENT_PHONE_KEY = "client_phone";
const CLIENT_PHONE_COUNTRY_KEY = "client_phone_country";
const TRACKING_THROTTLE_PREFIX = "client_tracking:";

const readJsonObject = (value?: Record<string, unknown>) =>
  value ? JSON.parse(JSON.stringify(value)) : {};

export const getStoredClientIdentity = (): StoredClientIdentity | null => {
  if (typeof window === "undefined") {
    return null;
  }

  const name = normalizeClientName(localStorage.getItem(CLIENT_NAME_KEY) || "");
  const phone = toStoredClientPhone(localStorage.getItem(CLIENT_PHONE_KEY) || "");
  const country = getDefaultClientPhoneCountry(
    localStorage.getItem(CLIENT_PHONE_COUNTRY_KEY) || phone,
  );

  if (validateClientName(name) || validateClientPhone(phone, country)) {
    return null;
  }

  return { name, phone, country };
};

export const saveStoredClientIdentity = (input: {
  name: string;
  phone: string;
  country: ClientPhoneCountry;
}) => {
  if (typeof window === "undefined") {
    return;
  }

  localStorage.setItem(CLIENT_NAME_KEY, normalizeClientName(input.name));
  localStorage.setItem(CLIENT_PHONE_KEY, toStoredClientPhone(input.phone));
  localStorage.setItem(CLIENT_PHONE_COUNTRY_KEY, input.country);
};

export const clearStoredClientIdentity = () => {
  if (typeof window === "undefined") {
    return;
  }

  localStorage.removeItem(CLIENT_NAME_KEY);
  localStorage.removeItem(CLIENT_PHONE_KEY);
  localStorage.removeItem(CLIENT_PHONE_COUNTRY_KEY);
};

const shouldThrottleActivity = (key: string, throttleMs: number) => {
  if (typeof window === "undefined" || throttleMs <= 0) {
    return false;
  }

  const storageKey = `${TRACKING_THROTTLE_PREFIX}${key}`;
  const lastValue = window.sessionStorage.getItem(storageKey);
  const now = Date.now();

  if (lastValue) {
    const last = Number(lastValue);
    if (Number.isFinite(last) && now - last < throttleMs) {
      return true;
    }
  }

  window.sessionStorage.setItem(storageKey, String(now));
  return false;
};

const resolveActivityIdentity = (overrides?: Partial<StoredClientIdentity>) => {
  const stored = getStoredClientIdentity();
  if (!stored) {
    return null;
  }

  return {
    ...stored,
    ...overrides,
  };
};

export const syncStoredClientLead = async (details?: Record<string, unknown>) => {
  const identity = resolveActivityIdentity();
  if (!identity) {
    return null;
  }

  const { data, error } = await supabase.rpc("upsert_client_lead", {
    _name: identity.name,
    _phone: identity.phone,
    _entry_source: "landing",
    _metadata: readJsonObject(details),
  });

  if (error) {
    console.error("Lead sync error:", error);
    return null;
  }

  return typeof data === "string" ? data : null;
};

export const recordStoredClientActivity = async (options: ActivityOptions) => {
  const identity = resolveActivityIdentity();
  if (!identity) {
    return null;
  }

  const throttleKey = options.throttleKey?.trim();
  if (throttleKey && shouldThrottleActivity(throttleKey, options.throttleMs ?? 120000)) {
    return null;
  }

  const { data, error } = await supabase.rpc("record_client_activity", {
    _name: identity.name,
    _phone: identity.phone,
    _route: options.route?.trim() || null,
    _service_key: options.serviceKey?.trim() || null,
    _action: options.action,
    _details: readJsonObject(options.details),
    _reference_id: options.referenceId?.trim() || null,
  });

  if (error) {
    console.error("Activity tracking error:", error);
    return null;
  }

  return typeof data === "string" ? data : null;
};

export const recordStoredClientApplication = async (options: ApplicationOptions) => {
  const identity = resolveActivityIdentity();
  if (!identity) {
    return null;
  }

  const { data, error } = await supabase.rpc("record_client_application", {
    _name: identity.name,
    _phone: identity.phone,
    _route: options.route?.trim() || null,
    _service_key: options.serviceKey,
    _reference_id: options.referenceId,
    _details: readJsonObject(options.details),
  });

  if (error) {
    console.error("Application tracking error:", error);
    return null;
  }

  return typeof data === "string" ? data : null;
};

export const getServiceKeyFromPath = (pathname: string): ClientServiceKey => {
  if (pathname.startsWith("/dashboard/ikamet")) return "ikamet";
  if (pathname.startsWith("/dashboard/sigorta")) return "sigorta";
  if (pathname.startsWith("/dashboard/viza")) return "visa";
  if (pathname.startsWith("/dashboard/calisma")) return "calisma";
  if (pathname.startsWith("/dashboard/tercume")) return "tercume";
  if (pathname.startsWith("/dashboard/hukuk")) return "hukuk";
  if (pathname.startsWith("/dashboard/universite")) return "universite";
  if (pathname.startsWith("/dashboard/deport")) return "deport";
  if (pathname.startsWith("/dashboard/konsolosluk")) return "konsolosluk";
  if (pathname.startsWith("/dashboard/iletisim")) return "iletisim";
  return "dashboard";
};
