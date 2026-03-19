import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { Button, Surface, TextField, TextArea, Label, Input, Spinner } from '@heroui/react';
import { SuccessScreen } from '@/components/shared/SuccessScreen';
import { SubmitButton } from '@/components/shared/SubmitButton';
import { supabase, getOrCreateClient } from '@/lib/supabase';
import { notifyAdminNewApplication } from '@/lib/admin-push';
import { toast } from '@/hooks/use-toast';
import { motion } from 'framer-motion';
import { Scale } from 'lucide-react';

export default function HukukPage() {
  const { t } = useTranslation();
  const [submitted, setSubmitted] = useState(false);
  const [loading, setLoading] = useState(false);
  const [form, setForm] = useState({
    full_name: localStorage.getItem('client_name') || '',
    phone: localStorage.getItem('client_phone') || '',
    problem: '',
  });
  const u = (k: string, v: string) => setForm(p => ({ ...p, [k]: v }));

  if (submitted) return <SuccessScreen />;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault(); setLoading(true);
    try {
      const cId = await getOrCreateClient(form.full_name, form.phone);
      const { data: application, error } = await supabase
        .from('hukuk_applications')
        .insert({ client_id: cId, ...form })
        .select('id')
        .single();
      if (error) throw error;
      void notifyAdminNewApplication('hukuk', application.id).catch((notifyError) => {
        console.error('Admin notify error:', notifyError);
      });
      setSubmitted(true); toast({ title: t('common.success') });
    } catch { toast({ title: t('common.error'), variant: 'destructive' }); } finally { setLoading(false); }
  };

  return (
    <motion.div initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} className="space-y-6">
      <div className="flex items-center gap-4">
        <div className="w-14 h-14 rounded-2xl bg-[#DCEDC8] flex items-center justify-center">
          <Scale className="h-7 w-7 text-[#6B8E23]" />
        </div>
        <div>
          <h2 className="font-heading text-2xl md:text-3xl font-extrabold text-slate-900">{t('hukuk.title')}</h2>
          <p className="text-slate-400 text-sm mt-0.5">{t('hukuk.description')}</p>
        </div>
      </div>

      <form onSubmit={handleSubmit}>
        <Surface className="rounded-md p-6 md:p-8 space-y-6 bg-white/50">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <TextField fullWidth isRequired name="full_name" variant="secondary" onChange={v => u('full_name', v)} value={form.full_name}>
              <Label>{t('form.fullName')}</Label>
              <Input />
            </TextField>
            <TextField fullWidth isRequired name="phone" type="tel" variant="secondary" onChange={v => u('phone', v)} value={form.phone}>
              <Label>{t('form.phone')}</Label>
              <Input placeholder="+90 5XX XXX XX XX" />
            </TextField>
          </div>

          <TextField fullWidth isRequired name="problem" variant="secondary" onChange={v => u('problem', v)} value={form.problem}>
            <Label>{t('form.problem')}</Label>
            <TextArea rows={5} placeholder={t('form.problemPlaceholder')} />
          </TextField>

          <SubmitButton isPending={loading} />
        </Surface>
      </form>
    </motion.div>
  );
}
