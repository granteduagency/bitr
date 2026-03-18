import { supabase } from "@/lib/supabase";

export type AppointmentCheckType = "phone" | "email";

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

const fileToBase64 = (file: File) =>
  new Promise<string>((resolve, reject) => {
    const reader = new FileReader();

    reader.onload = () => {
      const result = reader.result;
      if (typeof result !== "string") {
        reject(new Error("Appointment file could not be read."));
        return;
      }

      const [, base64 = ""] = result.split(",");
      resolve(base64);
    };

    reader.onerror = () => {
      reject(reader.error || new Error("Appointment file could not be read."));
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
  const contentsBase64 = await fileToBase64(file);
  const { data, error } = await supabase.functions.invoke("randevu-check", {
    body: {
      action: "parse",
      file: {
        filename: file.name,
        mimeType: file.type || null,
        contentsBase64,
      },
    },
  });

  if (error) {
    throw new Error(error.message || "Appointment file parse failed.");
  }

  return data as AppointmentParsedData;
}

export async function checkAppointmentStatus(input: {
  registrationNumber: string;
  documentNumber: string;
  checkType: AppointmentCheckType;
  phone?: string | null;
  email?: string | null;
  parsedData: AppointmentParsedData;
}): Promise<AppointmentCheckResult> {
  const { data, error } = await supabase.functions.invoke("randevu-check", {
    body: {
      action: "check",
      registrationNumber: input.registrationNumber,
      documentNumber: input.documentNumber,
      checkType: input.checkType,
      phone: input.phone || null,
      email: input.email || null,
      parsedData: input.parsedData,
    },
  });

  if (error) {
    throw new Error(error.message || "Appointment status check failed.");
  }

  return data as AppointmentCheckResult;
}
