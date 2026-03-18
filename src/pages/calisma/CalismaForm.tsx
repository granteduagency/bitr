import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { useParams } from 'react-router-dom';
import { Button, Surface, Label, TextField, TextArea, Spinner } from '@heroui/react';
import { FileUpload } from '@/components/shared/FileUpload';
import { SuccessScreen } from '@/components/shared/SuccessScreen';
import { SubmitButton } from '@/components/shared/SubmitButton';
import { supabase, getOrCreateClient } from '@/lib/supabase';
import { toast } from '@/hooks/use-toast';
import { motion } from 'framer-motion';
import { Briefcase, Plane } from 'lucide-react';

export default function CalismaForm() {
  const { t } = useTranslation();
  const { type } = useParams<{ type: string }>();
  const [submitted, setSubmitted] = useState(false);
  const [loading, setLoading] = useState(false);
  const [docs, setDocs] = useState<string[]>([]);
  const [notes, setNotes] = useState('');

  if (submitted) return <SuccessScreen />;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault(); setLoading(true);
    try {
      const clientName = localStorage.getItem('client_name') || '';
      const clientPhone = localStorage.getItem('client_phone') || '';
      const clientId = await getOrCreateClient(clientName, clientPhone);
      const { error } = await supabase.from('calisma_applications').insert({
        client_id: clientId,
        type: type === 'yurt-ici' ? 'yurt_ici' : 'yurt_disi',
        documents_url: docs, notes,
      });
      if (error) throw error;
      setSubmitted(true); toast({ title: t('common.success') });
    } catch (err) { console.error(err); toast({ title: t('common.error'), variant: 'destructive' }); }
    finally { setLoading(false); }
  };

  const isYurtIci = type === 'yurt-ici';

  return (
    <motion.div initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} className="space-y-6">
      <div className="flex items-center gap-4">
        <div className={`w-14 h-14 rounded-2xl flex items-center justify-center ${isYurtIci ? 'bg-[#C8D5F5]' : 'bg-[#E0D4F0]'}`}>
          {isYurtIci ? <Briefcase className="h-7 w-7 text-[#4A6EC5]" /> : <Plane className="h-7 w-7 text-[#7B5EA7]" />}
        </div>
        <div>
          <h2 className="font-heading text-2xl md:text-3xl font-extrabold text-slate-900">
            {isYurtIci ? t('calisma.yurtIci') : t('calisma.yurtDisi')}
          </h2>
          <p className="text-slate-400 text-sm mt-0.5">Hujjatlaringizni yuklang</p>
        </div>
      </div>

      <form onSubmit={handleSubmit}>
        <Surface className="rounded-md p-6 md:p-8 space-y-6 bg-white/50">
          <FileUpload label={t('common.upload') + ' 1'} onUpload={(url) => setDocs(prev => [...prev.filter(Boolean), url])} accept="image/*,.pdf" />
          <FileUpload label={t('common.upload') + ' 2'} onUpload={(url) => setDocs(prev => [...prev.filter(Boolean), url])} accept="image/*,.pdf" />

          <TextField fullWidth name="notes" variant="secondary" onChange={setNotes} value={notes}>
            <Label>{t('admin.notes')} <span className="text-muted text-xs font-normal">({t('common.optional')})</span></Label>
            <TextArea placeholder="..." rows={4} />
          </TextField>

          <SubmitButton isPending={loading} />
        </Surface>
      </form>
    </motion.div>
  );
}
