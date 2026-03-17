import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { FileUpload } from '@/components/shared/FileUpload';
import { Button } from '@/components/ui/button';
import { supabase, getOrCreateClient } from '@/lib/supabase';
import { SuccessScreen } from '@/components/shared/SuccessScreen';
import { toast } from '@/hooks/use-toast';

export default function IkametSonuc() {
  const { t } = useTranslation();
  const [submitted, setSubmitted] = useState(false);
  const [loading, setLoading] = useState(false);
  const [appointmentUrl, setAppointmentUrl] = useState('');

  if (submitted) return <SuccessScreen />;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!appointmentUrl) return;
    setLoading(true);
    try {
      const clientName = localStorage.getItem('client_name') || '';
      const clientPhone = localStorage.getItem('client_phone') || '';
      const clientId = await getOrCreateClient(clientName, clientPhone);

      const { error } = await supabase.from('ikamet_applications').insert({
        client_id: clientId,
        category: 'sonuc',
        type: 'sonuc',
        appointment_url: appointmentUrl,
      });
      if (error) throw error;
      setSubmitted(true);
      toast({ title: t('common.success') });
    } catch (err) {
      console.error(err);
      toast({ title: t('common.error'), variant: 'destructive' });
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="space-y-6 animate-fade-in pb-20 lg:pb-6">
      <h2 className="font-heading text-xl font-bold">{t('ikamet.sonuc')}</h2>
      <form onSubmit={handleSubmit} className="space-y-4">
        <FileUpload label={t('form.appointmentUpload')} onUpload={setAppointmentUrl} accept="image/*,.pdf" />
        <Button type="submit" className="w-full" size="lg" disabled={loading || !appointmentUrl}>
          {loading ? t('common.loading') : t('common.submit')}
        </Button>
      </form>
    </div>
  );
}
