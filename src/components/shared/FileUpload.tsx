import { useCallback, useState } from 'react';
import { Upload, X, FileText, Image } from 'lucide-react';
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
    } catch (err) { console.error('Upload error:', err); }
    finally { setUploading(false); }
  }, [onUpload, preview]);

  const handleRemove = () => { setPreviewUrl(null); onUpload(''); };

  return (
    <div className="space-y-2">
      <label className="text-sm font-semibold">{label}</label>
      {previewUrl ? (
        <div className="relative border border-border/40 rounded-xl p-3 bg-muted/20">
          <button onClick={handleRemove} className="absolute top-2 right-2 p-1.5 rounded-lg bg-destructive/10 hover:bg-destructive/20 text-destructive transition-colors">
            <X className="h-3.5 w-3.5" />
          </button>
          {previewUrl.match(/\.(jpg|jpeg|png|gif|webp)/) || previewUrl.startsWith('blob:') ? (
            <img src={previewUrl} alt={label} className="h-20 w-20 object-cover rounded-lg" />
          ) : (
            <div className="flex items-center gap-2 text-sm text-muted-foreground">
              <FileText className="h-5 w-5 text-success" />
              <span className="font-medium">{t('common.upload')} ✓</span>
            </div>
          )}
        </div>
      ) : (
        <label className="flex flex-col items-center justify-center border-2 border-dashed border-border/50 rounded-xl p-5 cursor-pointer hover:border-primary/40 hover:bg-primary/3 transition-all duration-200">
          <div className="w-10 h-10 rounded-lg bg-primary/8 flex items-center justify-center mb-2">
            {uploading ? <div className="w-5 h-5 border-2 border-primary/30 border-t-primary rounded-full animate-spin" /> : <Upload className="h-5 w-5 text-primary" />}
          </div>
          <span className="text-sm font-medium text-muted-foreground">
            {uploading ? t('common.loading') : t('common.upload')}
          </span>
          <input type="file" accept={accept} onChange={handleUpload} className="hidden" disabled={uploading} />
        </label>
      )}
    </div>
  );
}
