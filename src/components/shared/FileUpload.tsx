import { useCallback, useRef, useState } from 'react';
import { Upload, CheckCircle, X, Loader2 } from 'lucide-react';
import { useTranslation } from 'react-i18next';
import { Label } from '@heroui/react';
import { Button } from '@/components/ui/button';
import { uploadFile } from '@/lib/supabase';
import { toast } from '@/hooks/use-toast';

interface FileUploadProps {
  label: string;
  accept?: string;
  onUpload: (url: string) => void;
  validateFile?: (file: File) => Promise<void> | void;
  value?: string;
  required?: boolean;
}

export function FileUpload({
  label,
  accept = 'image/*,.pdf',
  onUpload,
  validateFile,
  value,
  required = false
}: FileUploadProps) {
  const { t } = useTranslation();
  const [uploading, setUploading] = useState(false);
  const [uploaded, setUploaded] = useState(!!value);
  const [fileName, setFileName] = useState('');
  const inputRef = useRef<HTMLInputElement>(null);

  const handleUpload = useCallback(async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setUploading(true);
    try {
      if (validateFile) {
        await validateFile(file);
      }

      const url = await uploadFile(file);
      if (url) {
        onUpload(url);
        setUploaded(true);
        setFileName(file.name);
      }
    } catch (err) {
      console.error('Upload error:', err);
      toast({
        title: t('common.error'),
        description: err instanceof Error ? err.message : undefined,
        variant: 'destructive',
      });
    } finally {
      setUploading(false);
      if (inputRef.current) {
        inputRef.current.value = '';
      }
    }
  }, [onUpload, validateFile, t]);

  const handleRemove = () => { setUploaded(false); setFileName(''); onUpload(''); };

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
              <span className="truncate max-w-[180px]">{fileName || t('common.upload') + ' ✓'}</span>
            </Button>
            <Button
              type="button"
              variant="secondary"
              size="icon"
              onClick={handleRemove}
              aria-label="Remove"
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
            {uploading ? t('common.loading') : label}
            <span className="text-muted text-xs ml-1"></span>
          </Button>
        )}
      </div>
      <input ref={inputRef} type="file" accept={accept} onChange={handleUpload} className="hidden" disabled={uploading} />
    </div>
  );
}
