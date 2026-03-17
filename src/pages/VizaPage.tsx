import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { useNavigate } from 'react-router-dom';
import { Card, CardContent } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { SuccessScreen } from '@/components/shared/SuccessScreen';
import { supabase, getOrCreateClient } from '@/lib/supabase';
import { toast } from '@/hooks/use-toast';

const vizaTypes = ['seyahat','isci','ogrenci','aile','biznes','transit','sofor'] as const;

export default function VizaPage() {
  const { t } = useTranslation();
  const [selectedType, setSelectedType] = useState<string | null>(null);
  const [submitted, setSubmitted] = useState(false);
  const [loading, setLoading] = useState(false);
  const [form, setForm] = useState({ from_country: '', to_country: '', travel_date: '', phone: localStorage.getItem('client_phone') || '' });
  const u = (k: string, v: string) => setForm(p => ({ ...p, [k]: v }));

  if (submitted) return <SuccessScreen />;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault(); setLoading(true);
    try {
      const cId = await getOrCreateClient(localStorage.getItem('client_name')!, localStorage.getItem('client_phone')!);
      await supabase.from('visa_applications').insert({ client_id: cId, type: selectedType!, ...form });
      setSubmitted(true); toast({ title: t('common.success') });
    } catch { toast({ title: t('common.error'), variant: 'destructive' }); } finally { setLoading(false); }
  };

  if (selectedType) return (
    <div className="space-y-6 animate-fade-in pb-20 lg:pb-6">
      <div className="flex items-center gap-2">
        <Button variant="ghost" size="sm" onClick={() => setSelectedType(null)}>{t('common.back')}</Button>
        <h2 className="font-heading text-xl font-bold">{t(`viza.types.${selectedType}`)}</h2>
      </div>
      <form onSubmit={handleSubmit} className="space-y-4">
        <div className="space-y-2"><label className="text-sm font-medium">{t('viza.fromCountry')}</label><Input value={form.from_country} onChange={e => u('from_country', e.target.value)} required /></div>
        <div className="space-y-2"><label className="text-sm font-medium">{t('viza.toCountry')}</label><Input value={form.to_country} onChange={e => u('to_country', e.target.value)} required /></div>
        <div className="space-y-2"><label className="text-sm font-medium">{t('viza.travelDate')}</label><Input type="date" value={form.travel_date} onChange={e => u('travel_date', e.target.value)} required /></div>
        <div className="space-y-2"><label className="text-sm font-medium">{t('form.phone')}</label><Input value={form.phone} onChange={e => u('phone', e.target.value)} type="tel" required /></div>
        <p className="text-sm text-muted-foreground">{t('viza.contactInfo')}</p>
        <Button type="submit" className="w-full" size="lg" disabled={loading}>{loading ? t('common.loading') : t('common.submit')}</Button>
      </form>
    </div>
  );

  return (
    <div className="space-y-4 animate-fade-in pb-20 lg:pb-0">
      <h2 className="font-heading text-xl font-bold">{t('viza.title')}</h2>
      <div className="grid gap-3">
        {vizaTypes.map(type => (
          <Card key={type} className="cursor-pointer hover:shadow-md transition-all hover:border-primary/30" onClick={() => setSelectedType(type)}>
            <CardContent className="p-4"><span className="font-heading font-semibold">{t(`viza.types.${type}`)}</span></CardContent>
          </Card>
        ))}
      </div>
    </div>
  );
}
