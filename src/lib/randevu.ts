import i18n from '@/i18n/config';
import { invokePublicFunction } from "@/lib/public-functions";

export type AppointmentCheckType = "phone" | "email";
const PDFJS_DIST_URL = "https://esm.sh/pdfjs-dist@4.10.38/legacy/build/pdf.mjs";
const PDFJS_WORKER_URL = "https://esm.sh/pdfjs-dist@4.10.38/legacy/build/pdf.worker.mjs";

export type AppointmentParsedData = {
  registrationNumber: string | null;
  documentNumber: string | null;
  phone: string | null;
  email: string | null;
  suggestedCheckType: AppointmentCheckType | null;
  source: "pdf" | "image" | "manual";
  warnings: string[];
};

export type AppointmentCheckStatus = {
  status: string | null;
  permitType: string | null;
  dates: string | null;
  pttBarcode: string | null;
};

export type AppointmentCheckResult = {
  success: boolean;
  checkType: AppointmentCheckType;
  attempts: number;
  error: string | null;
  checkedAt: string;
  parsedData: AppointmentParsedData;
  randevuStatus: AppointmentCheckStatus | null;
};

const translateAppointmentWarning = (warning: string) => {
  const translations: Record<string, string> = {
    kayit_numarasi_ayiklanamadi: i18n.t("ikamet.parseWarningRegistrationNumber"),
    belge_numarasi_ayiklanamadi: i18n.t("ikamet.parseWarningDocumentNumber"),
    telefon_veya_eposta_ayiklanamadi: i18n.t("ikamet.parseWarningContact"),
    "Registration number could not be extracted.": i18n.t("ikamet.parseWarningRegistrationNumber"),
    "Document number could not be extracted.": i18n.t("ikamet.parseWarningDocumentNumber"),
    "Phone or email could not be extracted.": i18n.t("ikamet.parseWarningContact"),
  };

  return translations[warning] || warning;
};

const localizeParsedAppointmentData = (parsed: AppointmentParsedData): AppointmentParsedData => ({
  ...parsed,
  warnings: parsed.warnings.map(translateAppointmentWarning),
});

const localizeAppointmentError = (message: string | null) => {
  const normalized = (message || "").trim();

  const translations: Record<string, string> = {
    "Could not create e-ikamet session.": i18n.t("ikamet.externalServiceUnavailable"),
    "Could not initialize e-ikamet login page.": i18n.t("ikamet.externalServiceUnavailable"),
    "Could not load captcha image.": i18n.t("ikamet.externalServiceNoResponse"),
    "e-ikamet login request failed.": i18n.t("ikamet.externalServiceNoResponse"),
    "Could not load application status page.": i18n.t("ikamet.externalServiceNoResponse"),
    "Could not load detailed application status.": i18n.t("ikamet.externalServiceNoResponse"),
    "Randevu tekshiruvini yakunlab bo'lmadi.": i18n.t("ikamet.externalServiceNoResponse"),
  };

  return translations[normalized] || normalized || i18n.t("ikamet.checkFailed");
};

const isAppointmentParseComplete = (parsed: AppointmentParsedData) =>
  Boolean(parsed.registrationNumber && parsed.documentNumber && (parsed.phone || parsed.email));

const assertValidAppointmentFile = (parsed: AppointmentParsedData) => {
  if (!isAppointmentParseComplete(parsed)) {
    throw new Error(i18n.t("ikamet.invalidAppointmentFile"));
  }
};

const fileToBase64 = (file: File) =>
  new Promise<string>((resolve, reject) => {
    const reader = new FileReader();

    reader.onload = () => {
      const result = reader.result;
      if (typeof result !== "string") {
        reject(new Error(i18n.t('common.appointmentFileReadError')));
        return;
      }

      const [, base64 = ""] = result.split(",");
      resolve(base64);
    };

    reader.onerror = () => {
      reject(reader.error || new Error(i18n.t('common.appointmentFileReadError')));
    };

    reader.readAsDataURL(file);
  });

export const normalizePhoneInput = (value: string) => {
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

const formatRegistrationNumber = (value: string) => {
  const digits = value.replace(/\D/g, "");
  if (digits.length !== 13) {
    return value.replace(/\s+/g, "").trim();
  }

  return `${digits.slice(0, 4)}-${digits.slice(4, 6)}-${digits.slice(6)}`;
};

const normalizeAppointmentText = (text: string) =>
  text
    .replace(/\u0131/g, "i")
    .replace(/\u0130/g, "I")
    .replace(/\s+/g, " ")
    .trim();

const normalizeParsedEmail = (value?: string | null) => {
  const email = (value || "").trim().toLowerCase();
  if (!email) {
    return null;
  }

  if (email.endsWith("@goc.gov.tr")) {
    return null;
  }

  return email;
};

const normalizeParsedPhone = (value?: string | null) => {
  const normalized = normalizePhoneInput(value || "");
  if (normalized.length !== 10 || !normalized.startsWith("5")) {
    return null;
  }

  return normalized;
};

const buildParsedAppointmentData = (input: {
  registrationNumber?: string | null;
  documentNumber?: string | null;
  phone?: string | null;
  email?: string | null;
  source: "pdf" | "image" | "manual";
}): AppointmentParsedData => {
  const parsed: AppointmentParsedData = {
    registrationNumber: input.registrationNumber?.trim() || null,
    documentNumber: input.documentNumber?.trim().toUpperCase() || null,
    phone: normalizeParsedPhone(input.phone),
    email: normalizeParsedEmail(input.email),
    suggestedCheckType: null,
    source: input.source,
    warnings: [],
  };

  parsed.suggestedCheckType = suggestAppointmentCheckType(parsed.phone, parsed.email);

  if (!parsed.registrationNumber) {
    parsed.warnings.push("kayit_numarasi_ayiklanamadi");
  }

  if (!parsed.documentNumber) {
    parsed.warnings.push("belge_numarasi_ayiklanamadi");
  }

  if (!parsed.phone && !parsed.email) {
    parsed.warnings.push("telefon_veya_eposta_ayiklanamadi");
  }

  return parsed;
};

export function extractAppointmentFieldsFromText(text: string): AppointmentParsedData {
  const normalizedText = normalizeAppointmentText(text);

  const registrationNumber =
    normalizedText.match(
      /(?:Registration\s*Number|Kayit\s*Numarasi)\s*(?:\([^)]*\))?\s*[:-]?\s*(\d{4}(?:[-\s]?\d{2})(?:[-\s]?\d{7}))/i,
    )?.[1] ||
    normalizedText.match(/(\d{4}-\d{2}-\d{7})/)?.[1] ||
    normalizedText.match(/(\d{13})/)?.[1] ||
    null;

  const documentNumber =
    normalizedText.match(
      /(?:Number\s*of\s*Document|Belge\s*No|Document)\s*[:-]?\s*([A-Z]{1,2}\d{6,8})/i,
    )?.[1] ||
    normalizedText.match(/\b([A-Z]{1,2}\d{6,8})\b/)?.[1] ||
    null;

  const phone =
    normalizedText.match(
      /(?:Telefon\s*1|Phone\s*1|Telefon\s*Numarasi|Phone\s*Number)\s*[:-]?\s*((?:\+?90\s*)?0?5\d{2}[\s-]?\d{3}[\s-]?\d{2}[\s-]?\d{2})/i,
    )?.[1] ||
    normalizedText.match(/((?:\+?90\s*)?0?5\d{2}[\s-]?\d{3}[\s-]?\d{2}[\s-]?\d{2})/)?.[1] ||
    null;

  const email =
    normalizedText.match(/E[-\s]?mail[:\s)]*([a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,})/i)?.[1] ||
    normalizedText.match(/E[-\s]?Posta[:\s)]*([a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,})/i)?.[1] ||
    normalizedText.match(/([a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,})/i)?.[1] ||
    null;

  return buildParsedAppointmentData({
    registrationNumber: registrationNumber ? formatRegistrationNumber(registrationNumber) : null,
    documentNumber,
    phone,
    email,
    source: "pdf",
  });
}

const extractPdfTextClient = async (file: File) => {
  const pdfjs = await import(/* @vite-ignore */ PDFJS_DIST_URL);
  pdfjs.GlobalWorkerOptions.workerSrc = PDFJS_WORKER_URL;

  const data = new Uint8Array(await file.arrayBuffer());
  const loadingTask = pdfjs.getDocument({
    data,
    disableFontFace: true,
    useSystemFonts: true,
    isEvalSupported: false,
  });

  const pdf = await loadingTask.promise;
  const chunks: string[] = [];

  for (let pageNumber = 1; pageNumber <= pdf.numPages; pageNumber += 1) {
    const page = await pdf.getPage(pageNumber);
    const content = await page.getTextContent();

    for (const item of content.items as Array<{ str?: string }>) {
      if (typeof item.str === "string") {
        chunks.push(item.str);
      }
    }
  }

  return chunks.join(" ");
};

export const formatPhoneForLookup = (value: string) => {
  const normalized = normalizePhoneInput(value);
  if (normalized.length !== 10) {
    return value.trim();
  }

  return `(${normalized.slice(0, 3)}) ${normalized.slice(3, 6)}-${normalized.slice(6, 8)}-${normalized.slice(8, 10)}`;
};

export const suggestAppointmentCheckType = (
  phone?: string | null,
  email?: string | null,
): AppointmentCheckType | null => {
  if (normalizePhoneInput(phone || "").length === 10) {
    return "phone";
  }

  if ((email || "").trim()) {
    return "email";
  }

  return null;
};

export async function parseAppointmentFile(file: File): Promise<AppointmentParsedData> {
  const isPdf = file.type === "application/pdf" || file.name.toLowerCase().endsWith(".pdf");

  if (!isPdf) {
    throw new Error(i18n.t("ikamet.appointmentPdfOnly"));
  }

  if (isPdf) {
    try {
      const text = await extractPdfTextClient(file);
      const parsed = localizeParsedAppointmentData(extractAppointmentFieldsFromText(text));

      if (isAppointmentParseComplete(parsed)) {
        return parsed;
      }
    } catch {
      // Fall through to the edge function parser when browser-side PDF parsing fails.
    }
  }

  const contentsBase64 = await fileToBase64(file);
  const parsed = await invokePublicFunction<AppointmentParsedData>("randevu-check", {
    action: "parse",
    file: {
      filename: file.name,
      mimeType: file.type || null,
      contentsBase64,
    },
  });

  const localizedParsed = localizeParsedAppointmentData(parsed);
  assertValidAppointmentFile(localizedParsed);
  return localizedParsed;
}

export async function checkAppointmentStatus(input: {
  registrationNumber: string;
  documentNumber: string;
  checkType: AppointmentCheckType;
  phone?: string | null;
  email?: string | null;
  parsedData: AppointmentParsedData;
}): Promise<AppointmentCheckResult> {
  const result = await invokePublicFunction<AppointmentCheckResult>("randevu-check", {
    action: "check",
    registrationNumber: input.registrationNumber,
    documentNumber: input.documentNumber,
    checkType: input.checkType,
    phone: input.phone || null,
    email: input.email || null,
    parsedData: input.parsedData,
  });

  return {
    ...result,
    error: localizeAppointmentError(result.error),
  };
}
