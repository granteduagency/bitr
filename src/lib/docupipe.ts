import { supabase } from "@/lib/supabase";

export interface PassportExtractionData {
  passport_number: string | null;
  surname: string | null;
  given_names: string | null;
  full_name: string | null;
  nationality: string | null;
  date_of_birth: string | null;
  date_of_issue: string | null;
  date_of_expiry: string | null;
  sex: string | null;
  place_of_birth: string | null;
  personal_number: string | null;
  issuing_country: string | null;
}

export interface PassportExtractionResult {
  documentId: string;
  standardizationId: string;
  schemaId: string;
  extraction: PassportExtractionData;
}

export interface PassportUploadValue extends PassportExtractionResult {
  storageUrl: string;
}

export interface PassportIdentityData {
  name: string;
  surname: string;
  fatherName: string;
  fullName: string;
}

const PASSPORT_EXTRACTION_KEYS = [
  "passport_number",
  "surname",
  "given_names",
  "full_name",
  "nationality",
  "date_of_birth",
  "date_of_issue",
  "date_of_expiry",
  "sex",
  "place_of_birth",
  "personal_number",
  "issuing_country",
] as const satisfies ReadonlyArray<keyof PassportExtractionData>;

const PATRONYMIC_MARKERS = new Set([
  "UGLI",
  "OGLI",
  "QIZI",
  "KIZI",
  "UGLU",
  "OGLU",
]);

const cleanText = (value?: string | null) => value?.replace(/\s+/g, " ").trim() || "";

const normalizeToken = (value: string) =>
  value
    .normalize("NFD")
    .replace(/\p{M}/gu, "")
    .replace(/[ʻ’'`‘-]/g, "")
    .replace(/[^A-Za-z]/g, "")
    .toUpperCase();

const splitNameTokens = (value?: string | null) =>
  cleanText(value)
    .split(" ")
    .map((token) => token.trim())
    .filter(Boolean);

const isRecord = (value: unknown): value is Record<string, unknown> =>
  typeof value === "object" && value !== null && !Array.isArray(value);

const readString = (value: unknown) => {
  if (typeof value !== "string") return null;
  const normalized = cleanText(value);
  return normalized || null;
};

const parsePassportIdentity = (extraction?: PassportExtractionData | null): PassportIdentityData => {
  const surname = cleanText(extraction?.surname);
  const fullName = cleanText(extraction?.full_name) || [cleanText(extraction?.given_names), surname].filter(Boolean).join(" ");
  const sourceTokens = splitNameTokens(extraction?.given_names || extraction?.full_name);
  const surnameTokens = splitNameTokens(surname);

  let workingTokens = [...sourceTokens];
  if (!cleanText(extraction?.given_names) && surnameTokens.length > 0 && workingTokens.length > surnameTokens.length) {
    const tail = workingTokens.slice(-surnameTokens.length).map(normalizeToken).join(" ");
    const normalizedSurname = surnameTokens.map(normalizeToken).join(" ");
    if (tail === normalizedSurname) {
      workingTokens = workingTokens.slice(0, -surnameTokens.length);
    }
  }

  const patronymicIndex = workingTokens.findIndex((token) => PATRONYMIC_MARKERS.has(normalizeToken(token)));
  const fatherName = patronymicIndex > 0 ? cleanText(workingTokens[patronymicIndex - 1]) : "";
  const givenNameTokens =
    patronymicIndex > 0
      ? workingTokens.slice(0, Math.max(1, patronymicIndex - 1))
      : workingTokens;
  const name = cleanText(givenNameTokens.join(" "));

  return {
    name,
    surname,
    fatherName,
    fullName,
  };
};

const fileToBase64 = (file: File) =>
  new Promise<string>((resolve, reject) => {
    const reader = new FileReader();

    reader.onload = () => {
      const result = reader.result;
      if (typeof result !== "string") {
        reject(new Error("Passport file could not be read."));
        return;
      }

      const [, base64 = ""] = result.split(",");
      resolve(base64);
    };

    reader.onerror = () => {
      reject(reader.error || new Error("Passport file could not be read."));
    };

    reader.readAsDataURL(file);
  });

export async function extractPassportFromFile(file: File): Promise<PassportExtractionResult> {
  const contentsBase64 = await fileToBase64(file);
  const { data, error } = await supabase.functions.invoke("docupipe-passport", {
    body: {
      action: "extract",
      file: {
        filename: file.name,
        contentsBase64,
      },
    },
  });

  if (error) {
    throw new Error(error.message || "Passport extraction failed.");
  }

  return data as PassportExtractionResult;
}

export async function getDocuPipeOriginalUrl(documentId: string): Promise<string> {
  const { data, error } = await supabase.functions.invoke("docupipe-passport", {
    body: {
      action: "original-url",
      documentId,
    },
  });

  if (error) {
    throw new Error(error.message || "Could not load passport original.");
  }

  const url = typeof data?.url === "string" ? data.url : "";
  if (!url) {
    throw new Error("DocuPipe did not return an original URL.");
  }

  return url;
}

export const passportSexToGender = (sex?: string | null) => {
  const normalized = sex?.trim().toUpperCase();
  if (normalized === "M") return "male";
  if (normalized === "F") return "female";
  return "";
};

export const toPassportExtractionData = (value: unknown): PassportExtractionData | null => {
  if (!isRecord(value)) return null;

  const extraction = Object.fromEntries(
    PASSPORT_EXTRACTION_KEYS.map((key) => [key, readString(value[key])]),
  ) as PassportExtractionData;

  return Object.values(extraction).some((field) => field !== null) ? extraction : null;
};

export const getPassportIdentity = (extraction?: PassportExtractionData | null) =>
  parsePassportIdentity(extraction);

export const getPassportGivenName = (extraction?: PassportExtractionData | null) =>
  parsePassportIdentity(extraction).name;

export const getPassportSurname = (extraction?: PassportExtractionData | null) =>
  parsePassportIdentity(extraction).surname;

export const getPassportFatherName = (extraction?: PassportExtractionData | null) =>
  parsePassportIdentity(extraction).fatherName;
