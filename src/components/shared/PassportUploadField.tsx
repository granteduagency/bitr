import { useCallback, useRef, useState } from "react";
import { CheckCircle, Upload, X } from "lucide-react";
import { useTranslation } from "react-i18next";
import { Button, Label, Spinner } from "@heroui/react";
import { toast } from "@/hooks/use-toast";
import { uploadFile } from "@/lib/supabase";
import {
  extractPassportFromFile,
  type PassportUploadValue,
} from "@/lib/docupipe";

interface PassportUploadFieldProps {
  label: string;
  accept?: string;
  value?: string;
  onChange: (value: PassportUploadValue | null) => void;
}

export function PassportUploadField({
  label,
  accept = "image/*,.pdf",
  value,
  onChange,
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
      const [storageUrl, extraction] = await Promise.all([
        uploadFile(file),
        extractPassportFromFile(file),
      ]);

      if (!storageUrl) {
        throw new Error("Passport file upload failed.");
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

  const formatHint = accept.includes("pdf") ? "PDF / IMG" : "IMG";

  return (
    <div className="flex flex-col gap-1.5">
      <Label className="text-sm font-medium">{label}</Label>
      <div className="flex items-center gap-2">
        {uploaded ? (
          <>
            <Button
              variant="secondary"
              size="sm"
              isDisabled
              className="pointer-events-none"
            >
              <CheckCircle className="h-4 w-4 text-[#3A8A56]" />
              <span className="truncate max-w-[180px]">
                {fileName || `${t("common.upload")} ✓`}
              </span>
            </Button>
            <Button
              variant="secondary"
              size="sm"
              onPress={handleRemove}
              aria-label="Remove"
            >
              <X className="h-3.5 w-3.5" />
            </Button>
          </>
        ) : (
          <Button
            variant="secondary"
            size="sm"
            isPending={uploading}
            onPress={() => inputRef.current?.click()}
          >
            {({ isPending }) => (
              <>
                {isPending ? <Spinner color="current" size="sm" /> : <Upload className="h-4 w-4" />}
                {isPending ? t("common.loading") : label}
                <span className="ml-1 text-xs text-muted">({formatHint})</span>
              </>
            )}
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
