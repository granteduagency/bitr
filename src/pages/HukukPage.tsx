import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Button } from '@/components/ui/button';
import { SuccessScreen } from '@/components/shared/SuccessScreen';
import { supabase, getOrCreateClient } from '@/lib/supabase';
import { toast } from '@/hooks/use-toast';

export default function HukukPage() {
  const { t } = useTranslation();
  const [submitted, setSubmitted] = useState(false);
  const [loading, setLoading] = useState(false);
  const [form, setForm] = useState({ full_name: localStorage.getItem('client_name') || '', phone: localStorage.getItem('client_phone') || '', problem: '' });
  const u = (k: string, v: string) => setForm(p => ({ ...p, [k]: v }));

  if (submitted) return <SuccessScreen />;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault(); setLoading(true);
    try {
      const cId = await getOrCreateClient(form.full_name, form.phone);
      await supabase.from('hukuk_applications').insert({ client_id: cId, ...form });
      setSubmitted(true); toast({ title: t('common.success') });
    } catch { toast({ title: t('common.error'), variant: 'destructive' }); } finally { setLoading(false); }
  };

  return (
    <div className="space-y-6 animate-fade-in pb-20 lg:pb-6">
      <h2 className="font-heading text-xl font-bold">{t('hukuk.title')}</h2>
      <p className="text-muted-foreground">{t('hukuk.description')}</p>
      <form onSubmit={handleSubmit} className="space-y-4">
        <div className="space-y-2"><label className="text-sm font-medium">{t('form.fullName')}</label><Input value={form.full_name} onChange={e => u('full_name', e.target.value)} required /></div>
        <div className="space-y-2"><label className="text-sm font-medium">{t('form.phone')}</label><Input value={form.phone} onChange={e => u('phone', e.target.value)} type="tel" required /></div>
        <div className="space-y-2"><label className="text-sm font-medium">{t('form.problem')}</label><Textarea value={form.problem} onChange={e => u('problem', e.target.value)} placeholder={t('form.problemPlaceholder')} rows={5} required /></div>
        <Button type="submit" className="w-full" size="lg" disabled={loading}>{loading ? t('common.loading') : t('common.submit')}</Button>
      </form>
    </div>
  );
}
