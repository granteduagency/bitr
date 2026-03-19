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

export const sanitizeClientNameInput = (value: string) =>
  value
    .replace(/[^\p{L}\p{M}\s'-]/gu, "")
    .replace(/\s+/g, " ")
    .replace(/^\s+/, "")
    .slice(0, 60);

export const normalizeClientName = (value: string) =>
  sanitizeClientNameInput(value).trim().replace(/\s+/g, " ");

export const normalizeClientPhoneDigits = (value: string) => {
  const digits = value.replace(/\D/g, "");

  if (digits.length === 12 && digits.startsWith("90")) {
    return digits.slice(2);
  }

  if (digits.length === 11 && digits.startsWith("0")) {
    return digits.slice(1);
  }

  if (digits.length > 10) {
    return digits.slice(-10);
  }

  return digits;
};

export const formatClientPhoneInput = (value: string) => {
  const digits = normalizeClientPhoneDigits(value).slice(0, 10);

  if (!digits) {
    return "";
  }

  const parts = ["+90"];
  if (digits.length > 0) parts.push(digits.slice(0, 3));
  if (digits.length > 3) parts.push(digits.slice(3, 6));
  if (digits.length > 6) parts.push(digits.slice(6, 8));
  if (digits.length > 8) parts.push(digits.slice(8, 10));

  return parts.join(" ").trim();
};

export const toStoredClientPhone = (value: string) =>
  formatClientPhoneInput(normalizeClientPhoneDigits(value));

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
  if (parts.some((part) => part.replace(/['-]/g, "").length < 2)) {
    return "landing.nameErrorInvalid";
  }

  const lowered = normalized.toLocaleLowerCase("tr-TR");
  if (blockedNameValues.has(lowered)) {
    return "landing.nameErrorFake";
  }

  if (/(.)\1{3,}/iu.test(lettersOnly) || /(asdf|qwer|zxcv|test|demo|admin)/iu.test(lowered)) {
    return "landing.nameErrorFake";
  }

  return null;
};

export const validateClientPhone = (value: string) => {
  const digits = normalizeClientPhoneDigits(value);

  if (!digits) {
    return "landing.phoneErrorRequired";
  }

  if (!/^5\d{9}$/.test(digits)) {
    return "landing.phoneErrorInvalid";
  }

  if (
    /^(\d)\1{9}$/.test(digits) ||
    /^(\d{2})\1{4}$/.test(digits) ||
    /^(\d{5})\1$/.test(digits) ||
    new Set(digits).size <= 2
  ) {
    return "landing.phoneErrorFake";
  }

  return null;
};
