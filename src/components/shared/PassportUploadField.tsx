import { useCallback, useRef, useState } from "react";
import { CheckCircle, Upload, X, Loader2 } from "lucide-react";
import { useTranslation } from "react-i18next";
import { Label } from "@heroui/react";
import { toast } from "@/hooks/use-toast";
import { uploadFile } from "@/lib/supabase";
import { Button } from "@/components/ui/button";
import {
  extractPassportFromFile,
  type PassportUploadValue,
} from "@/lib/docupipe";

interface PassportUploadFieldProps {
  label: string;
  accept?: string;
  value?: string;
  onChange: (value: PassportUploadValue | null) => void;
  required?: boolean;
}

export function PassportUploadField({
  label,
  accept = "image/*,.pdf",
  value,
  onChange,
  required = false,
}: PassportUploadFieldProps) {
  const { t } = useTranslation();
  const [uploading, setUploading] = useState(false);
  const [uploaded, setUploaded] = useState(!!value);
  const [fileName, setFileName] = useState("");
  const inputRef = useRef<HTMLInputElement>(null);

  const handleUpload = useCallback(async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setUploading(true);
    try {
      const extraction = await extractPassportFromFile(file);
      const storageUrl = await uploadFile(file);

      if (!storageUrl) {
        throw new Error(t("common.passportUploadFailed"));
      }

      onChange({
        storageUrl,
        ...extraction,
      });
      setUploaded(true);
      setFileName(file.name);
    } catch (error) {
      console.error("Passport upload error:", error);
      onChange(null);
      toast({
        title: t("common.error"),
        description: error instanceof Error ? error.message : undefined,
        variant: "destructive",
      });
    } finally {
      setUploading(false);
      if (inputRef.current) {
        inputRef.current.value = "";
      }
    }
  }, [onChange, t]);

  const handleRemove = useCallback(() => {
    setUploaded(false);
    setFileName("");
    onChange(null);
    if (inputRef.current) {
      inputRef.current.value = "";
    }
  }, [onChange]);

  const formatHint = accept.includes("pdf") ? t("common.pdfOrImage") : "";

  return (
    <div className="flex flex-col gap-1.5">
      <Label className="text-sm font-medium">
        {label}
        {required ? <span className="ml-1 text-red-500">*</span> : null}
      </Label>
      <div className="flex items-center gap-2">
        {uploaded ? (
          <>
            <Button
              type="button"
              variant="secondary"
              size="sm"
              disabled
              className="pointer-events-none border border-slate-300 bg-white"
            >
              <CheckCircle className="h-4 w-4 text-[#3A8A56]" />
              <span className="truncate max-w-[180px]">
                {fileName || `${t("common.upload")} ✓`}
              </span>
            </Button>
            <Button
              type="button"
              variant="secondary"
              size="icon"
              onClick={handleRemove}
              aria-label={t("common.remove")}
              className="border border-slate-300 bg-white hover:bg-slate-50"
            >
              <X className="h-3.5 w-3.5" />
            </Button>
          </>
        ) : (
          <Button
            type="button"
            variant="secondary"
            size="sm"
            disabled={uploading}
            onClick={() => inputRef.current?.click()}
            className="border border-slate-300 bg-white hover:bg-slate-50"
          >
            {uploading ? <Loader2 className="h-4 w-4 animate-spin" /> : <Upload className="h-4 w-4" />}
            {uploading ? t("common.loading") : label}
            <span className="ml-1 text-xs text-muted">({formatHint})</span>
          </Button>
        )}
      </div>
      <input
        ref={inputRef}
        type="file"
        accept={accept}
        onChange={handleUpload}
        className="hidden"
        disabled={uploading}
      />
    </div>
  );
}
