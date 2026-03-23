import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { useParams } from 'react-router-dom';
import { Input, Surface, Label, TextField } from '@heroui/react';
import { SuccessScreen } from '@/components/shared/SuccessScreen';
import { SubmitButton } from '@/components/shared/SubmitButton';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { supabase, getOrCreateClient } from '@/lib/supabase';
import { notifyAdminNewApplication } from '@/lib/admin-push';
import { recordStoredClientApplication } from '@/lib/client-tracking';
import { toast } from '@/hooks/use-toast';
import { motion } from 'framer-motion';
import { Briefcase, Plane } from 'lucide-react';

export default function CalismaForm() {
  const { t } = useTranslation();
  const { type } = useParams<{ type: string }>();
  const [submitted, setSubmitted] = useState(false);
  const [loading, setLoading] = useState(false);
  const [form, setForm] = useState({
    full_name: localStorage.getItem('client_name') || '',
    phone: localStorage.getItem('client_phone') || '',
    has_employer: '',
    job_type: '',
  });

  const updateForm = (key: keyof typeof form, value: string) =>
    setForm((prev) => ({ ...prev, [key]: value }));

  if (submitted) return <SuccessScreen />;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!form.full_name || !form.phone || !form.has_employer || !form.job_type) {
      toast({ title: t('common.error'), description: t('common.required'), variant: 'destructive' });
      return;
    }

    setLoading(true);
    try {
      localStorage.setItem('client_name', form.full_name);
      localStorage.setItem('client_phone', form.phone);

      const clientId = await getOrCreateClient(form.full_name, form.phone);
      const applicationId = crypto.randomUUID();
      const { error } = await supabase.from('calisma_applications').insert({
        id: applicationId,
        client_id: clientId,
        type: type === 'yurt-ici' ? 'yurt_ici' : 'yurt_disi',
        has_employer: form.has_employer === 'yes',
        job_type: form.job_type,
      });
      if (error) throw error;
      await recordStoredClientApplication({
        route: typeof window !== 'undefined' ? window.location.pathname : '/dashboard/calisma',
        serviceKey: 'calisma',
        referenceId: applicationId,
        details: {
          type: type === 'yurt-ici' ? 'yurt_ici' : 'yurt_disi',
          hasEmployer: form.has_employer === 'yes',
          jobType: form.job_type,
        },
      }).catch((trackingError) => {
        console.error('Work permit tracking error:', trackingError);
      });
      void notifyAdminNewApplication('calisma', applicationId).catch((notifyError) => {
        console.error('Admin notify error:', notifyError);
      });
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
          <p className="text-slate-400 text-sm mt-0.5">{t('calisma.description')}</p>
        </div>
      </div>

      <form onSubmit={handleSubmit}>
        <Surface className="rounded-md p-6 md:p-8 space-y-6 bg-white/50">
          <TextField fullWidth isRequired name="full_name" variant="secondary" onChange={(value) => updateForm('full_name', value)} value={form.full_name}>
            <Label>{t('form.fullName')}</Label>
            <Input placeholder={t('landing.namePlaceholder')} />
          </TextField>
          <TextField fullWidth isRequired name="phone" type="tel" variant="secondary" onChange={(value) => updateForm('phone', value)} value={form.phone}>
            <Label>{t('form.phone')}</Label>
            <Input placeholder="+90 5XX XXX XX XX" />
          </TextField>
          <div className="space-y-1.5">
            <Label>{t('calisma.hasEmployer')}</Label>
            <Select value={form.has_employer} onValueChange={(value) => updateForm('has_employer', value)}>
              <SelectTrigger className="w-full">
                <SelectValue placeholder={t('common.select')} />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="yes">{t('common.yes')}</SelectItem>
                <SelectItem value="no">{t('common.no')}</SelectItem>
              </SelectContent>
            </Select>
          </div>
          <TextField fullWidth isRequired name="job_type" variant="secondary" onChange={(value) => updateForm('job_type', value)} value={form.job_type}>
            <Label>{t('calisma.jobType')}</Label>
            <Input placeholder={t('calisma.jobTypePlaceholder')} />
          </TextField>

          <SubmitButton isPending={loading} />
        </Surface>
      </form>
    </motion.div>
  );
}
