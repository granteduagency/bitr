import { useCallback, useState } from 'react';
import { Upload, X, FileText } from 'lucide-react';
import { useTranslation } from 'react-i18next';
import { uploadFile } from '@/lib/supabase';

interface FileUploadProps {
  label: string;
  accept?: string;
  onUpload: (url: string) => void;
  value?: string;
  preview?: boolean;
}

export function FileUpload({ label, accept = 'image/*,.pdf', onUpload, value, preview = true }: FileUploadProps) {
  const { t } = useTranslation();
  const [uploading, setUploading] = useState(false);
  const [previewUrl, setPreviewUrl] = useState<string | null>(value || null);

  const handleUpload = useCallback(async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setUploading(true);
    try {
      const url = await uploadFile(file);
      if (url) {
        onUpload(url);
        if (file.type.startsWith('image/') && preview) {
          setPreviewUrl(URL.createObjectURL(file));
        } else {
          setPreviewUrl(url);
        }
      }
    } catch (err) {
      console.error('Upload error:', err);
    } finally {
      setUploading(false);
    }
  }, [onUpload, preview]);

  const handleRemove = () => {
    setPreviewUrl(null);
    onUpload('');
  };

  return (
    <div className="space-y-2">
      <label className="text-sm font-medium">{label}</label>
      {previewUrl ? (
        <div className="relative border rounded-lg p-3 bg-muted/30">
          <button onClick={handleRemove} className="absolute top-1 right-1 p-1 rounded-full bg-destructive/10 hover:bg-destructive/20 text-destructive">
            <X className="h-3 w-3" />
          </button>
          {previewUrl.match(/\.(jpg|jpeg|png|gif|webp)/) || previewUrl.startsWith('blob:') ? (
            <img src={previewUrl} alt={label} className="h-20 w-20 object-cover rounded" />
          ) : (
            <div className="flex items-center gap-2 text-sm text-muted-foreground">
              <FileText className="h-5 w-5" />
              <span>{t('common.upload')} ✓</span>
            </div>
          )}
        </div>
      ) : (
        <label className="flex flex-col items-center justify-center border-2 border-dashed rounded-lg p-6 cursor-pointer hover:border-primary/50 hover:bg-primary/5 transition-colors">
          <Upload className="h-8 w-8 text-muted-foreground mb-2" />
          <span className="text-sm text-muted-foreground">
            {uploading ? t('common.loading') : t('common.upload')}
          </span>
          <input type="file" accept={accept} onChange={handleUpload} className="hidden" disabled={uploading} />
        </label>
      )}
    </div>
  );
}
