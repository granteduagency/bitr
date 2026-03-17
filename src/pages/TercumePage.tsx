import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { Button } from '@/components/ui/button';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Checkbox } from '@/components/ui/checkbox';
import { FileUpload } from '@/components/shared/FileUpload';
import { SuccessScreen } from '@/components/shared/SuccessScreen';
import { supabase, getOrCreateClient } from '@/lib/supabase';
import { toast } from '@/hooks/use-toast';

const docTypeKeys = ['passport','diploma','birthCert','criminalRecord','powerOfAttorney','other'] as const;
const langKeys = ['tr','uz','en','ru','ar','de','fr'] as const;

export default function TercumePage() {
  const { t } = useTranslation();
  const [submitted, setSubmitted] = useState(false);
  const [loading, setLoading] = useState(false);
  const [selectedDocs, setSelectedDocs] = useState<string[]>([]);
  const [fromLang, setFromLang] = useState('');
  const [toLang, setToLang] = useState('');
  const [docUrls, setDocUrls] = useState<Record<string, string>>({});

  if (submitted) return <SuccessScreen />;

  const toggleDoc = (key: string) => setSelectedDocs(prev => prev.includes(key) ? prev.filter(d => d !== key) : [...prev, key]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault(); setLoading(true);
    try {
      const cId = await getOrCreateClient(localStorage.getItem('client_name')!, localStorage.getItem('client_phone')!);
      await supabase.from('tercume_applications').insert({
        client_id: cId, document_types: selectedDocs, from_language: fromLang, to_language: toLang,
        documents_url: Object.values(docUrls).filter(Boolean),
      });
      setSubmitted(true); toast({ title: t('common.success') });
    } catch { toast({ title: t('common.error'), variant: 'destructive' }); } finally { setLoading(false); }
  };

  return (
    <div className="space-y-6 animate-fade-in pb-20 lg:pb-6">
      <h2 className="font-heading text-xl font-bold">{t('tercume.title')}</h2>
      <form onSubmit={handleSubmit} className="space-y-4">
        <div className="space-y-3">
          <label className="text-sm font-medium">{t('tercume.documentType')}</label>
          {docTypeKeys.map(k => (
            <div key={k} className="flex items-center gap-2">
              <Checkbox checked={selectedDocs.includes(k)} onCheckedChange={() => toggleDoc(k)} />
              <span className="text-sm">{t(`tercume.documentTypes.${k}`)}</span>
            </div>
          ))}
        </div>
        <div className="grid grid-cols-2 gap-3">
          <div className="space-y-2"><label className="text-sm font-medium">{t('tercume.fromLanguage')}</label>
            <Select value={fromLang} onValueChange={setFromLang}><SelectTrigger><SelectValue placeholder={t('common.select')} /></SelectTrigger><SelectContent>{langKeys.map(k => <SelectItem key={k} value={k}>{t(`tercume.languages.${k}`)}</SelectItem>)}</SelectContent></Select></div>
          <div className="space-y-2"><label className="text-sm font-medium">{t('tercume.toLanguage')}</label>
            <Select value={toLang} onValueChange={setToLang}><SelectTrigger><SelectValue placeholder={t('common.select')} /></SelectTrigger><SelectContent>{langKeys.map(k => <SelectItem key={k} value={k}>{t(`tercume.languages.${k}`)}</SelectItem>)}</SelectContent></Select></div>
        </div>
        {selectedDocs.length > 0 && (
          <div className="space-y-3">
            <label className="text-sm font-medium">{t('tercume.uploadDocuments')}</label>
            {selectedDocs.map(dk => (
              <FileUpload key={dk} label={t(`tercume.documentTypes.${dk}`)} onUpload={url => setDocUrls(p => ({ ...p, [dk]: url }))} />
            ))}
          </div>
        )}
        <Button type="submit" className="w-full" size="lg" disabled={loading || selectedDocs.length === 0}>{loading ? t('common.loading') : t('common.submit')}</Button>
      </form>
    </div>
  );
}
