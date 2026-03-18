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
  mrz: string | null;
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

export const getPassportGivenName = (extraction?: PassportExtractionData | null) =>
  extraction?.given_names || extraction?.full_name || "";

export const getPassportSurname = (extraction?: PassportExtractionData | null) =>
  extraction?.surname || "";
