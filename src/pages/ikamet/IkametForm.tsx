import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { useNavigate } from 'react-router-dom';
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
import { motion } from 'framer-motion';

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
    passport_url: '', father_name: '', mother_name: '', photo_url: '',
    phone: localStorage.getItem('client_phone') || '', email: '', address: '',
    has_insurance: false, student_cert_url: '', supporter_id_front_url: '',
    supporter_id_back_url: '', supporter_passport_url: '', supporter_student_cert_url: '',
  });
  const u = (k: string, v: any) => setForm(p => ({ ...p, [k]: v }));

  if (submitted) return <SuccessScreen />;

  if (type === 'uzun_donem' && uzunDonemEligible === null) {
    return (
      <Dialog open={uzunDonemModal} onOpenChange={(open) => { if (!open) navigate(-1); setUzunDonemModal(open); }}>
        <DialogContent className="rounded-2xl">
          <DialogHeader><DialogTitle className="font-heading text-center text-lg">{t('ikamet.uzunDonemModal')}</DialogTitle></DialogHeader>
          <div className="flex gap-3 pt-2">
            <Button className="flex-1 h-12 rounded-xl gradient-primary text-primary-foreground" onClick={() => { setUzunDonemEligible(true); setUzunDonemModal(false); }}>{t('common.yes')}</Button>
            <Button variant="outline" className="flex-1 h-12 rounded-xl" onClick={() => setUzunDonemEligible(false)}>{t('common.no')}</Button>
          </div>
        </DialogContent>
      </Dialog>
    );
  }

  if (type === 'uzun_donem' && uzunDonemEligible === false) {
    return (
      <motion.div initial={{ opacity: 0, scale: 0.95 }} animate={{ opacity: 1, scale: 1 }} className="text-center py-16 space-y-6">
        <div className="w-20 h-20 mx-auto rounded-2xl bg-primary/10 flex items-center justify-center"><MessageCircle className="h-10 w-10 text-primary" /></div>
        <h2 className="page-header">{t('ikamet.uzunDonemNo')}</h2>
        <Button variant="outline" className="rounded-xl" onClick={() => navigate('/dashboard/iletisim')}>{t('services.iletisim')}</Button>
      </motion.div>
    );
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault(); setLoading(true);
    try {
      const cId = await getOrCreateClient(localStorage.getItem('client_name')!, localStorage.getItem('client_phone')!);
      const { error } = await supabase.from('ikamet_applications').insert({
        client_id: cId, category, type, ...form, supporter_type: type === 'aile' ? supporterType : null,
      });
      if (error) throw error;
      setSubmitted(true); toast({ title: t('common.success') });
    } catch (err) { console.error(err); toast({ title: t('common.error'), variant: 'destructive' }); }
    finally { setLoading(false); }
  };

  const titleKey = type === 'ogrenci' ? 'ogrenci' : type === 'aile' ? 'aile' : type === 'kisa_donem' ? 'kisaDonem' : 'uzunDonem';

  return (
    <motion.div initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.4 }}
      className="space-y-6 pb-24 lg:pb-6">
      <h2 className="page-header">{t(`ikamet.${titleKey}`)}</h2>

      <form onSubmit={handleSubmit} className="form-section space-y-5">
        <FileUpload label={t('form.passport')} onUpload={(url) => u('passport_url', url)} accept="image/*,.pdf" />

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div className="space-y-2"><label className="text-sm font-semibold">{t('form.fatherName')}</label><Input value={form.father_name} onChange={e => u('father_name', e.target.value)} className="rounded-xl h-11" required /></div>
          <div className="space-y-2"><label className="text-sm font-semibold">{t('form.motherName')}</label><Input value={form.mother_name} onChange={e => u('mother_name', e.target.value)} className="rounded-xl h-11" required /></div>
        </div>

        <FileUpload label={t('form.photo')} onUpload={(url) => u('photo_url', url)} accept="image/*" />

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div className="space-y-2"><label className="text-sm font-semibold">{t('form.phone')}</label><Input value={form.phone} onChange={e => u('phone', e.target.value)} type="tel" className="rounded-xl h-11" required /></div>
          <div className="space-y-2"><label className="text-sm font-semibold">{t('form.email')}</label><Input value={form.email} onChange={e => u('email', e.target.value)} type="email" className="rounded-xl h-11" /></div>
        </div>

        <div className="space-y-2"><label className="text-sm font-semibold">{t('form.address')} <span className="text-muted-foreground text-xs font-normal">({t('common.optional')})</span></label><Input value={form.address} onChange={e => u('address', e.target.value)} className="rounded-xl h-11" /></div>

        <div className="space-y-2">
          <label className="text-sm font-semibold">{t('form.insurance')}</label>
          <Select value={form.has_insurance ? 'yes' : 'no'} onValueChange={v => u('has_insurance', v === 'yes')}>
            <SelectTrigger className="rounded-xl h-11"><SelectValue /></SelectTrigger>
            <SelectContent><SelectItem value="yes">{t('form.insuranceYes')}</SelectItem><SelectItem value="no">{t('form.insuranceNo')}</SelectItem></SelectContent>
          </Select>
        </div>

        {type === 'ogrenci' && <FileUpload label={t('form.studentCert')} onUpload={(url) => u('student_cert_url', url)} accept="image/*,.pdf" />}

        {type === 'aile' && (
          <div className="space-y-5 border-t border-border/40 pt-5">
            <h3 className="font-heading font-bold text-base">{t('form.supporterDocs')}</h3>
            <FileUpload label={t('form.studentCert')} onUpload={url => u('student_cert_url', url)} accept="image/*,.pdf" />
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <FileUpload label={t('form.supporterIdFront')} onUpload={url => u('supporter_id_front_url', url)} accept="image/*" />
              <FileUpload label={t('form.supporterIdBack')} onUpload={url => u('supporter_id_back_url', url)} accept="image/*" />
            </div>
            <div className="space-y-2">
              <label className="text-sm font-semibold">{t('form.supporterType')}</label>
              <TabSelector tabs={[{ key: 'yabanci', label: t('form.supporterTypeForeign') }, { key: 'turk', label: t('form.supporterTypeTurkish') }]} value={supporterType} onChange={setSupporterType} />
            </div>
            {supporterType === 'yabanci' && <FileUpload label={t('form.supporterPassport')} onUpload={url => u('supporter_passport_url', url)} accept="image/*,.pdf" />}
            <FileUpload label={t('form.supporterStudentCert')} onUpload={url => u('supporter_student_cert_url', url)} accept="image/*,.pdf" />
          </div>
        )}

        <Button type="submit" className="w-full h-12 rounded-xl gradient-primary text-primary-foreground font-semibold text-base shadow-primary hover:shadow-lg transition-all" disabled={loading}>
          {loading ? t('common.loading') : t('common.submit')}
        </Button>
      </form>
    </motion.div>
  );
}
