import { useCallback, useRef, useState } from 'react';
import { Upload, CheckCircle, X } from 'lucide-react';
import { useTranslation } from 'react-i18next';
import { Button, Spinner, Label } from '@heroui/react';
import { uploadFile } from '@/lib/supabase';

interface FileUploadProps {
  label: string;
  accept?: string;
  onUpload: (url: string) => void;
  value?: string;
}

export function FileUpload({ label, accept = 'image/*,.pdf', onUpload, value }: FileUploadProps) {
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
      const url = await uploadFile(file);
      if (url) {
        onUpload(url);
        setUploaded(true);
        setFileName(file.name);
      }
    } catch (err) { console.error('Upload error:', err); }
    finally { setUploading(false); }
  }, [onUpload]);

  const handleRemove = () => { setUploaded(false); setFileName(''); onUpload(''); };

  const formatHint = accept.includes('pdf') ? 'PDF / IMG' : 'IMG';

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
              <span className="truncate max-w-[180px]">{fileName || t('common.upload') + ' ✓'}</span>
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
                {isPending ? t('common.loading') : label}
                <span className="text-muted text-xs ml-1">({formatHint})</span>
              </>
            )}
          </Button>
        )}
      </div>
      <input ref={inputRef} type="file" accept={accept} onChange={handleUpload} className="hidden" disabled={uploading} />
    </div>
  );
}
