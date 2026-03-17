import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { useNavigate, useParams } from 'react-router-dom';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { FileUpload } from '@/components/shared/FileUpload';
import { TabSelector } from '@/components/shared/TabSelector';
import { SuccessScreen } from '@/components/shared/SuccessScreen';
import { supabase, getOrCreateClient } from '@/lib/supabase';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { MessageCircle } from 'lucide-react';
import { toast } from '@/hooks/use-toast';

interface IkametFormProps {
  category: 'ilk_kez' | 'uzatma' | 'gecis';
  type: 'ogrenci' | 'aile' | 'kisa_donem' | 'uzun_donem';
}

export default function IkametForm({ category, type }: IkametFormProps) {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const [submitted, setSubmitted] = useState(false);
  const [loading, setLoading] = useState(false);
  const [uzunDonemModal, setUzunDonemModal] = useState(type === 'uzun_donem');
  const [uzunDonemEligible, setUzunDonemEligible] = useState<boolean | null>(null);
  const [supporterType, setSupporterType] = useState('yabanci');

  const [form, setForm] = useState({
    passport_url: '',
    father_name: '',
    mother_name: '',
    photo_url: '',
    phone: localStorage.getItem('client_phone') || '',
    email: '',
    address: '',
    has_insurance: false,
    student_cert_url: '',
    supporter_id_front_url: '',
    supporter_id_back_url: '',
    supporter_passport_url: '',
    supporter_student_cert_url: '',
  });

  const updateForm = (key: string, value: any) => setForm((prev) => ({ ...prev, [key]: value }));

  if (submitted) return <SuccessScreen />;

  // Uzun donem modal
  if (type === 'uzun_donem' && uzunDonemEligible === null) {
    return (
      <Dialog open={uzunDonemModal} onOpenChange={(open) => { if (!open) navigate(-1); setUzunDonemModal(open); }}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle className="font-heading text-center">{t('ikamet.uzunDonemModal')}</DialogTitle>
          </DialogHeader>
          <div className="flex gap-3">
            <Button className="flex-1" onClick={() => { setUzunDonemEligible(true); setUzunDonemModal(false); }}>
              {t('common.yes')}
            </Button>
            <Button variant="outline" className="flex-1" onClick={() => setUzunDonemEligible(false)}>
              {t('common.no')}
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    );
  }

  if (type === 'uzun_donem' && uzunDonemEligible === false) {
    return (
      <div className="text-center py-16 space-y-6 animate-fade-in">
        <MessageCircle className="h-16 w-16 text-primary mx-auto" />
        <h2 className="font-heading text-xl font-bold">{t('ikamet.uzunDonemNo')}</h2>
        <div className="flex justify-center gap-4">
          <Button variant="outline" onClick={() => navigate('/dashboard/iletisim')}>
            {t('services.iletisim')}
          </Button>
        </div>
      </div>
    );
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    try {
      const clientName = localStorage.getItem('client_name') || '';
      const clientPhone = localStorage.getItem('client_phone') || '';
      const clientId = await getOrCreateClient(clientName, clientPhone);

      const { error } = await supabase.from('ikamet_applications').insert({
        client_id: clientId,
        category,
        type,
        ...form,
        supporter_type: type === 'aile' ? supporterType : null,
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

  const showStudentCert = type === 'ogrenci';
  const showSupporterFields = type === 'aile';

  return (
    <div className="space-y-6 animate-fade-in pb-20 lg:pb-6">
      <h2 className="font-heading text-xl font-bold">
        {t(`ikamet.${type === 'ogrenci' ? 'ogrenci' : type === 'aile' ? 'aile' : type === 'kisa_donem' ? 'kisaDonem' : 'uzunDonem'}`)}
      </h2>

      <form onSubmit={handleSubmit} className="space-y-4">
        <FileUpload label={t('form.passport')} onUpload={(url) => updateForm('passport_url', url)} accept="image/*,.pdf" />

        <div className="space-y-2">
          <label className="text-sm font-medium">{t('form.fatherName')}</label>
          <Input value={form.father_name} onChange={(e) => updateForm('father_name', e.target.value)} required />
        </div>

        <div className="space-y-2">
          <label className="text-sm font-medium">{t('form.motherName')}</label>
          <Input value={form.mother_name} onChange={(e) => updateForm('mother_name', e.target.value)} required />
        </div>

        <FileUpload label={t('form.photo')} onUpload={(url) => updateForm('photo_url', url)} accept="image/*" />

        <div className="space-y-2">
          <label className="text-sm font-medium">{t('form.phone')}</label>
          <Input value={form.phone} onChange={(e) => updateForm('phone', e.target.value)} type="tel" required />
        </div>

        <div className="space-y-2">
          <label className="text-sm font-medium">{t('form.email')}</label>
          <Input value={form.email} onChange={(e) => updateForm('email', e.target.value)} type="email" />
        </div>

        <div className="space-y-2">
          <label className="text-sm font-medium">{t('form.address')} <span className="text-muted-foreground text-xs">({t('common.optional')})</span></label>
          <Input value={form.address} onChange={(e) => updateForm('address', e.target.value)} />
        </div>

        <div className="space-y-2">
          <label className="text-sm font-medium">{t('form.insurance')}</label>
          <Select value={form.has_insurance ? 'yes' : 'no'} onValueChange={(v) => updateForm('has_insurance', v === 'yes')}>
            <SelectTrigger><SelectValue /></SelectTrigger>
            <SelectContent>
              <SelectItem value="yes">{t('form.insuranceYes')}</SelectItem>
              <SelectItem value="no">{t('form.insuranceNo')}</SelectItem>
            </SelectContent>
          </Select>
        </div>

        {showStudentCert && (
          <FileUpload label={t('form.studentCert')} onUpload={(url) => updateForm('student_cert_url', url)} accept="image/*,.pdf" />
        )}

        {showSupporterFields && (
          <div className="space-y-4 border-t pt-4">
            <h3 className="font-heading font-semibold">{t('form.supporterDocs')}</h3>

            <FileUpload label={t('form.studentCert')} onUpload={(url) => updateForm('student_cert_url', url)} accept="image/*,.pdf" />

            <FileUpload label={t('form.supporterIdFront')} onUpload={(url) => updateForm('supporter_id_front_url', url)} accept="image/*" />
            <FileUpload label={t('form.supporterIdBack')} onUpload={(url) => updateForm('supporter_id_back_url', url)} accept="image/*" />

            <div className="space-y-2">
              <label className="text-sm font-medium">{t('form.supporterType')}</label>
              <TabSelector
                tabs={[
                  { key: 'yabanci', label: t('form.supporterTypeForeign') },
                  { key: 'turk', label: t('form.supporterTypeTurkish') },
                ]}
                value={supporterType}
                onChange={setSupporterType}
              />
            </div>

            {supporterType === 'yabanci' && (
              <FileUpload label={t('form.supporterPassport')} onUpload={(url) => updateForm('supporter_passport_url', url)} accept="image/*,.pdf" />
            )}

            <FileUpload label={t('form.supporterStudentCert')} onUpload={(url) => updateForm('supporter_student_cert_url', url)} accept="image/*,.pdf" />
          </div>
        )}

        <Button type="submit" className="w-full" size="lg" disabled={loading}>
          {loading ? t('common.loading') : t('common.submit')}
        </Button>
      </form>
    </div>
  );
}
