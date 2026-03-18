import { useEffect, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { Button, Label, Surface, Spinner } from '@heroui/react';
import { FileUpload } from '@/components/shared/FileUpload';
import { PassportUploadField } from '@/components/shared/PassportUploadField';
import { MultiSelect } from '@/components/shared/MultiSelect';
import { SuccessScreen } from '@/components/shared/SuccessScreen';
import { SubmitButton } from '@/components/shared/SubmitButton';
import { supabase, getOrCreateClient } from '@/lib/supabase';
import type { PassportUploadValue } from '@/lib/docupipe';
import { toast } from '@/hooks/use-toast';
import { motion } from 'framer-motion';
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue
} from "@/components/ui/select";
import { Languages } from 'lucide-react';

const docTypeKeys = ['passport','diploma','birthCert','criminalRecord','powerOfAttorney','other'] as const;
const langKeys = ['tr','uz','en','ru','ar','de','fr'] as const;

export default function TercumePage() {
  const { t } = useTranslation();
  const [submitted, setSubmitted] = useState(false);
  const [loading, setLoading] = useState(false);
  const [selectedDocs, setSelectedDocs] = useState<string[]>([]);
  const [fromLang, setFromLang] = useState('');
  const [toLang, setToLang] = useState('');
  const [passportMeta, setPassportMeta] = useState<PassportUploadValue | null>(null);
  const [docUrls, setDocUrls] = useState<Record<string, string>>({});

  useEffect(() => {
    setDocUrls((prev) => {
      const next = Object.fromEntries(Object.entries(prev).filter(([key]) => selectedDocs.includes(key)));
      return Object.keys(next).length === Object.keys(prev).length ? prev : next;
    });

    if (!selectedDocs.includes('passport')) {
      setPassportMeta(null);
    }
  }, [selectedDocs]);

  if (submitted) return <SuccessScreen />;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault(); setLoading(true);
    try {
      const cId = await getOrCreateClient(localStorage.getItem('client_name')!, localStorage.getItem('client_phone')!);
      await supabase.from('tercume_applications').insert({
        client_id: cId, document_types: selectedDocs, from_language: fromLang,
        to_language: toLang,
        documents_url: selectedDocs.map((key) => docUrls[key]).filter(Boolean),
        passport_document_id: selectedDocs.includes('passport') ? passportMeta?.documentId ?? null : null,
        passport_extraction: selectedDocs.includes('passport') ? passportMeta?.extraction ?? null : null,
      });
      setSubmitted(true); toast({ title: t('common.success') });
    } catch { toast({ title: t('common.error'), variant: 'destructive' }); } finally { setLoading(false); }
  };

  const LangSelect = ({ value, onChange, label }: { value: string; onChange: (v: string) => void; label: string }) => (
    <div className="flex flex-col gap-1.5">
      <Label>{label}</Label>
      <Select value={value || ''} onValueChange={onChange}>
        <SelectTrigger className="w-full">
          <SelectValue placeholder={t('common.select')} />
        </SelectTrigger>
        <SelectContent>
          {langKeys.map(k => (
            <SelectItem key={k} value={k}>
              {t(`tercume.languages.${k}`)}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>
    </div>
  );

  const docTypeOptions = docTypeKeys.map(k => ({
    value: k,
    label: t(`tercume.documentTypes.${k}`),
  }));

  return (
    <motion.div initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} className="space-y-6">
      <div className="flex items-center gap-4">
        <div className="w-14 h-14 rounded-2xl bg-[#D5F0E8] flex items-center justify-center">
          <Languages className="h-7 w-7 text-[#2E7D60]" />
        </div>
        <div>
          <h2 className="font-heading text-2xl md:text-3xl font-extrabold text-slate-900">{t('tercume.title')}</h2>
          <p className="text-slate-400 text-sm mt-0.5">Hujjat turini tanlang va yuklang</p>
        </div>
      </div>

      <form onSubmit={handleSubmit}>
        <Surface className="rounded-md p-6 md:p-8 space-y-6 bg-white/50">
          {/* Document type multi-select */}
          <MultiSelect
            label={t('tercume.documentType')}
            placeholder="Hujjat turini tanlang..."
            options={docTypeOptions}
            value={selectedDocs}
            onChange={setSelectedDocs}
            selectAllLabel="Hammasini tanlash"
          />

          {/* Language selects - side by side */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <LangSelect value={fromLang} onChange={setFromLang} label={t('tercume.fromLanguage')} />
            <LangSelect value={toLang} onChange={setToLang} label={t('tercume.toLanguage')} />
          </div>

          {/* Document uploads per selected type */}
          {selectedDocs.length > 0 && (
            <div className="space-y-3 border-t border-default/20 pt-5">
              <Label>{t('tercume.uploadDocuments')}</Label>
              {selectedDocs.map(dk => (
                dk === 'passport' ? (
                  <PassportUploadField
                    key={dk}
                    label={t(`tercume.documentTypes.${dk}`)}
                    onChange={(value) => {
                      setPassportMeta(value);
                      setDocUrls((prev) => ({ ...prev, [dk]: value?.storageUrl || '' }));
                    }}
                  />
                ) : (
                  <FileUpload
                    key={dk}
                    label={t(`tercume.documentTypes.${dk}`)}
                    onUpload={url => setDocUrls(p => ({ ...p, [dk]: url }))}
                  />
                )
              ))}
            </div>
          )}

          <SubmitButton isDisabled={selectedDocs.length === 0} isPending={loading} />
        </Surface>
      </form>
    </motion.div>
  );
}
