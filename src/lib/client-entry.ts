import {
  getCountries,
  getCountryCallingCode,
  isPossiblePhoneNumber,
  isValidPhoneNumber,
  parsePhoneNumber,
  type Country,
  type Value,
} from "react-phone-number-input/input";
import isAlpha from "validator/es/lib/isAlpha";
import { parseFullName } from "parse-full-name";

const blockedNameValues = new Set([
  "test",
  "test test",
  "demo",
  "demo user",
  "admin",
  "user",
  "asd",
  "asdf",
  "asdf asdf",
  "qwerty",
  "qwerty qwerty",
  "name surname",
  "ad soyad",
  "isim soyisim",
  "aaa aaa",
  "abc abc",
]);

const allowedNamePattern = /^[\p{L}\p{M}'-]+(?: [\p{L}\p{M}'-]+)+$/u;
const allowedNameTokenPattern = /^[\p{L}\p{M}'-]+$/u;
const suspiciousNameSeedPattern =
  /(asdf|asdasd|adasd|dasdas|qwerty|qweqwe|zxczxc|abcabc|test|demo|admin|user|name|surname|soyad|isim)/iu;
const repeatedChunkPattern = /^(.{2,4})\1{1,}$/u;
const phoneCountries = getCountries();

export type ClientPhoneCountry = Country;

const getParsedNationalDigits = (value: string) =>
  value.replace(/\D/g, "");

const isLowEntropyNumber = (digits: string) =>
  /^(\d)\1+$/.test(digits) ||
  /^(\d{2})\1+$/.test(digits) ||
  /^(\d{3})\1+$/.test(digits) ||
  /^12345/.test(digits) ||
  /^98765/.test(digits) ||
  /^0000/.test(digits) ||
  /^9999/.test(digits) ||
  /^1111/.test(digits) ||
  /^2222/.test(digits) ||
  /^5555/.test(digits) ||
  new Set(digits).size <= 2;

const normalizeStoredPhone = (value?: string | null) => {
  const trimmed = (value || "").trim();
  if (!trimmed) {
    return "";
  }

  if (trimmed.startsWith("00")) {
    return `+${trimmed.slice(2)}`;
  }

  return trimmed;
};

export const clientPhoneCountries = phoneCountries;

export const sanitizeClientNameInput = (value: string) =>
  value
    .replace(/[^\p{L}\p{M}\s'-]/gu, "")
    .replace(/\s+/g, " ")
    .replace(/^\s+/, "")
    .slice(0, 60);

export const normalizeClientName = (value: string) =>
  sanitizeClientNameInput(value).trim().replace(/\s+/g, " ");

const countVowels = (value: string) => {
  const matches = value.match(/[aeiouyаеёиоуыэюяıöüâêîôûáéíóúàèìòù]/giu);
  return matches?.length || 0;
};

const getUniqueNgramRatio = (value: string, size: number) => {
  if (value.length <= size) {
    return 1;
  }

  const total = value.length - size + 1;
  const grams = new Set<string>();

  for (let index = 0; index < total; index += 1) {
    grams.add(value.slice(index, index + size));
  }

  return grams.size / total;
};

const normalizeNameToken = (value: string) =>
  value
    .toLocaleLowerCase("tr-TR")
    .replace(/['-]/g, "");

const isValidatorAlphaToken = (value: string) => {
  if (allowedNameTokenPattern.test(value)) {
    return true;
  }

  return (
    isAlpha(value, "tr-TR", { ignore: "'-" }) ||
    isAlpha(value, "en-US", { ignore: "'-" }) ||
    isAlpha(value, "ru-RU", { ignore: "'-" })
  );
};

const isSuspiciousNameToken = (value: string) => {
  const normalized = normalizeNameToken(value);

  if (!normalized) {
    return true;
  }

  if (suspiciousNameSeedPattern.test(normalized) || repeatedChunkPattern.test(normalized)) {
    return true;
  }

  if (/(\p{L})\1{3,}/u.test(normalized)) {
    return true;
  }

  if (normalized.length >= 6) {
    const uniqueChars = new Set(normalized).size;
    const trigramRatio = getUniqueNgramRatio(normalized, 3);
    const bigramRatio = getUniqueNgramRatio(normalized, 2);
    const vowelCount = countVowels(normalized);

    if (uniqueChars <= 3) {
      return true;
    }

    if (uniqueChars <= 4 && trigramRatio < 0.65) {
      return true;
    }

    if (bigramRatio < 0.55) {
      return true;
    }

    if (vowelCount === 0 || vowelCount / normalized.length < 0.15) {
      return true;
    }
  }

  return false;
};

const hasStructuredFullName = (value: string) => {
  const parsed = parseFullName(value, "all", 0, 0, 0);

  if (parsed.error.length > 0) {
    return false;
  }

  return Boolean(parsed.first.trim() && parsed.last.trim());
};

export const getDefaultClientPhoneCountry = (value?: string | null): ClientPhoneCountry => {
  const parsed = parseClientPhoneValue(value);
  if (parsed?.country) {
    return parsed.country;
  }

  return "TR";
};

export const parseClientPhoneValue = (value?: string | null) => {
  const normalized = normalizeStoredPhone(value);
  if (!normalized) {
    return null;
  }

  try {
    return parsePhoneNumber(normalized as Value);
  } catch {
    return null;
  }
};

export const toStoredClientPhone = (value?: string | null) => {
  const normalized = normalizeStoredPhone(value);
  if (!normalized) {
    return "";
  }

  if (normalized.startsWith("+") && isPossiblePhoneNumber(normalized)) {
    return normalized;
  }

  return "";
};

export const formatClientPhoneInput = (value?: string | null) => {
  const parsed = parseClientPhoneValue(value);

  if (parsed) {
    return parsed.formatInternational();
  }

  return normalizeStoredPhone(value);
};

export const getClientCountryCallingCode = (country: ClientPhoneCountry) =>
  `+${getCountryCallingCode(country)}`;

export const validateClientName = (value: string) => {
  const normalized = normalizeClientName(value);

  if (!normalized) {
    return "landing.nameErrorRequired";
  }

  const lettersOnly = normalized.replace(/[\s'-]/g, "");
  if (lettersOnly.length < 4) {
    return "landing.nameErrorShort";
  }

  if (!allowedNamePattern.test(normalized)) {
    return "landing.nameErrorInvalid";
  }

  const parts = normalized.split(" ");
  if (parts.some((part) => part.replace(/['-]/g, "").length < 2 || !isValidatorAlphaToken(part))) {
    return "landing.nameErrorInvalid";
  }

  const lowered = normalized.toLocaleLowerCase("tr-TR");
  if (blockedNameValues.has(lowered)) {
    return "landing.nameErrorFake";
  }

  if (
    /(.)\1{3,}/iu.test(lettersOnly) ||
    suspiciousNameSeedPattern.test(lowered) ||
    parts.some((part) => isSuspiciousNameToken(part))
  ) {
    return "landing.nameErrorFake";
  }

  if (!hasStructuredFullName(normalized)) {
    return "landing.nameErrorFake";
  }

  return null;
};

export const validateClientPhone = (value: string, country?: ClientPhoneCountry | null) => {
  const normalized = normalizeStoredPhone(value);

  if (!normalized) {
    return "landing.phoneErrorRequired";
  }

  if (!normalized.startsWith("+")) {
    return "landing.phoneErrorInvalid";
  }

  if (!isPossiblePhoneNumber(normalized) || !isValidPhoneNumber(normalized)) {
    return "landing.phoneErrorInvalid";
  }

  const parsed = parseClientPhoneValue(normalized);
  if (!parsed) {
    return "landing.phoneErrorInvalid";
  }

  const nationalDigits = getParsedNationalDigits(parsed.nationalNumber || "");
  if (nationalDigits.length < 6 || isLowEntropyNumber(nationalDigits)) {
    return "landing.phoneErrorFake";
  }

  const selectedCountry = country || parsed.country;
  if (selectedCountry === "TR") {
    if (parsed.country !== "TR" || !nationalDigits.startsWith("5") || nationalDigits.length !== 10) {
      return "landing.phoneErrorTurkeyMobile";
    }
  }

  return null;
};
