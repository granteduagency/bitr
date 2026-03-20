import countries from "i18n-iso-countries";

export type CountryCode = string;

type AppLocale = "uz" | "tr" | "en";

type CountryOption = {
  code: CountryCode;
  label: string;
};

const PRIORITY_COUNTRIES = ["TR", "UZ", "AZ", "DE", "RU", "US"];
const FALLBACK_LOCALE: AppLocale = "en";
const COUNTRY_CODES = Object.keys(countries.getAlpha2Codes());
const NORMALIZE_PATTERN = /[\u0300-\u036f]/g;

const localeDisplayNames = new Map<AppLocale, Intl.DisplayNames>();
const aliasToCountryCode = new Map<string, CountryCode>();

function getDisplayNames(locale: AppLocale) {
  const cached = localeDisplayNames.get(locale);
  if (cached) {
    return cached;
  }

  const displayNames = new Intl.DisplayNames([locale], {
    type: "region",
  });
  localeDisplayNames.set(locale, displayNames);
  return displayNames;
}

function normalizeCountryAlias(value: string) {
  return value
    .trim()
    .toLowerCase()
    .normalize("NFD")
    .replace(NORMALIZE_PATTERN, "")
    .replace(/[^a-z]/g, "");
}

function registerCountryAlias(code: CountryCode, label?: string | null) {
  if (!label) {
    return;
  }

  const normalized = normalizeCountryAlias(label);
  if (!normalized) {
    return;
  }

  aliasToCountryCode.set(normalized, code);
}

function bootstrapCountryAliases() {
  for (const code of COUNTRY_CODES) {
    registerCountryAlias(code, code);
    registerCountryAlias(code, getDisplayNames("uz").of(code));
    registerCountryAlias(code, getDisplayNames("tr").of(code));
    registerCountryAlias(code, getDisplayNames("en").of(code));
  }
}

bootstrapCountryAliases();

export function resolveCountryLocale(locale?: string | null): AppLocale {
  if (!locale) {
    return FALLBACK_LOCALE;
  }

  if (locale.startsWith("uz")) {
    return "uz";
  }

  if (locale.startsWith("tr")) {
    return "tr";
  }

  return FALLBACK_LOCALE;
}

export function isCountryCode(value?: string | null): value is CountryCode {
  return !!value && COUNTRY_CODES.includes(value.toUpperCase());
}

export function getCountryNameFromCode(
  code?: string | null,
  locale?: string | null,
) {
  if (!code) {
    return "";
  }

  const normalizedCode = code.toUpperCase();
  if (!isCountryCode(normalizedCode)) {
    return "";
  }

  const displayNames = getDisplayNames(resolveCountryLocale(locale));
  return (
    displayNames.of(normalizedCode) ||
    getDisplayNames(FALLBACK_LOCALE).of(normalizedCode) ||
    normalizedCode
  );
}

export function getCountryCodeFromValue(value?: string | null) {
  if (!value) {
    return "";
  }

  const trimmed = value.trim();
  const upperValue = trimmed.toUpperCase();

  if (isCountryCode(upperValue)) {
    return upperValue;
  }

  return aliasToCountryCode.get(normalizeCountryAlias(trimmed)) || "";
}

export function getCountryOptions(locale?: string | null): CountryOption[] {
  const resolvedLocale = resolveCountryLocale(locale);

  const priorityOptions = PRIORITY_COUNTRIES.map((code) => ({
    code,
    label: getCountryNameFromCode(code, resolvedLocale),
  }));

  const remainingOptions = COUNTRY_CODES
    .filter((code) => !PRIORITY_COUNTRIES.includes(code))
    .map((code) => ({
      code,
      label: getCountryNameFromCode(code, resolvedLocale),
    }))
    .sort((left, right) => left.label.localeCompare(right.label, resolvedLocale));

  return [...priorityOptions, ...remainingOptions];
}
