import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { useNavigate } from 'react-router-dom';
import {
  Button, Input, Label, Surface, TextField, Modal,
} from '@heroui/react';
import { FileUpload } from '@/components/shared/FileUpload';
import { PassportUploadField } from '@/components/shared/PassportUploadField';
import { TabSelector } from '@/components/shared/TabSelector';
import { SuccessScreen } from '@/components/shared/SuccessScreen';
import { SubmitButton } from '@/components/shared/SubmitButton';
import { supabase, getOrCreateClient } from '@/lib/supabase';
import { notifyAdminNewApplication } from '@/lib/admin-push';
import type { PassportUploadValue } from '@/lib/docupipe';
import { MessageCircle } from 'lucide-react';
import { toast } from '@/hooks/use-toast';
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue
} from "@/components/ui/select";
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
  const [uzunDonemOpen, setUzunDonemOpen] = useState(type === 'uzun_donem');
  const [uzunDonemEligible, setUzunDonemEligible] = useState<boolean | null>(null);
  const [supporterType, setSupporterType] = useState('yabanci');
  const [passportMeta, setPassportMeta] = useState<PassportUploadValue | null>(null);
  const [supporterPassportMeta, setSupporterPassportMeta] = useState<PassportUploadValue | null>(null);

  const [form, setForm] = useState({
    passport_url: '', father_name: '', mother_name: '', photo_url: '',
    phone: localStorage.getItem('client_phone') || '', email: '', address: '',
    has_insurance: 'no', student_cert_url: '', supporter_id_front_url: '',
    supporter_id_back_url: '', supporter_passport_url: '', supporter_student_cert_url: '',
  });
  const u = <K extends keyof typeof form>(k: K, v: (typeof form)[K]) =>
    setForm((prev) => ({ ...prev, [k]: v }));

  if (submitted) return <SuccessScreen />;

  /* ── Uzun dönem modal ── */
  if (type === 'uzun_donem' && uzunDonemEligible === null) {
    return (
      <Modal.Backdrop isOpen={uzunDonemOpen} onOpenChange={(o) => { if (!o) navigate(-1); setUzunDonemOpen(o); }}>
        <Modal.Container placement="center">
          <Modal.Dialog className="sm:max-w-[360px]">
            <Modal.Header>
              <Modal.Heading className="text-center">{t('ikamet.uzunDonemModal')}</Modal.Heading>
            </Modal.Header>
            <Modal.Footer>
              <Button className="flex-1" onPress={() => { setUzunDonemEligible(true); setUzunDonemOpen(false); }}>{t('common.yes')}</Button>
              <Button className="flex-1" variant="secondary" onPress={() => setUzunDonemEligible(false)}>{t('common.no')}</Button>
            </Modal.Footer>
          </Modal.Dialog>
        </Modal.Container>
      </Modal.Backdrop>
    );
  }

  if (type === 'uzun_donem' && uzunDonemEligible === false) {
    return (
      <motion.div initial={{ opacity: 0, scale: 0.95 }} animate={{ opacity: 1, scale: 1 }} className="text-center py-16 space-y-6">
        <div className="w-20 h-20 mx-auto rounded-[1.5rem] bg-[#C8D5F5] flex items-center justify-center">
          <MessageCircle className="h-10 w-10 text-[#4A6EC5]" />
        </div>
        <h2 className="font-heading text-2xl font-extrabold text-slate-900">{t('ikamet.uzunDonemNo')}</h2>
        <Button onPress={() => navigate('/dashboard/iletisim')}>{t('services.iletisim')}</Button>
      </motion.div>
    );
  }

  /* ── Submit ── */
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault(); setLoading(true);
    try {
      const cId = await getOrCreateClient(localStorage.getItem('client_name')!, localStorage.getItem('client_phone')!);
      const applicationId = crypto.randomUUID();
      const { error } = await supabase.from('ikamet_applications').insert({
        id: applicationId,
        client_id: cId,
        category,
        type,
        ...form,
        passport_document_id: passportMeta?.documentId ?? null,
        passport_extraction: passportMeta?.extraction ?? null,
        supporter_passport_document_id: supporterType === 'yabanci' ? supporterPassportMeta?.documentId ?? null : null,
        supporter_passport_extraction: supporterType === 'yabanci' ? supporterPassportMeta?.extraction ?? null : null,
        supporter_passport_url: supporterType === 'yabanci' ? form.supporter_passport_url : '',
        has_insurance: form.has_insurance === 'yes',
        supporter_type: type === 'aile' ? supporterType : null,
      });
      if (error) throw error;
      void notifyAdminNewApplication('ikamet', applicationId).catch((notifyError) => {
        console.error('Admin notify error:', notifyError);
      });
      setSubmitted(true); toast({ title: t('common.success') });
    } catch (err) { console.error(err); toast({ title: t('common.error'), variant: 'destructive' }); }
    finally { setLoading(false); }
  };

  const titleKey = type === 'ogrenci' ? 'ogrenci' : type === 'aile' ? 'aile' : type === 'kisa_donem' ? 'kisaDonem' : 'uzunDonem';

  return (
    <motion.div initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.4 }} className="space-y-6">
      <div>
        <h2 className="font-heading text-2xl md:text-3xl font-extrabold text-slate-900">{t(`ikamet.${titleKey}`)}</h2>
        <p className="text-slate-400 text-sm mt-1">Ma'lumotlarni to'ldiring</p>
      </div>

      <form onSubmit={handleSubmit}>
        <Surface className="rounded-3xl p-6 md:p-8 space-y-6">
          {/* ── 1. Ota & Ona ismi (eng muhim shaxsiy ma'lumot) ── */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <TextField fullWidth isRequired name="father_name" variant="secondary" onChange={v => u('father_name', v)} value={form.father_name}>
              <Label>{t('form.fatherName')}</Label>
              <Input placeholder="Ahmedov Karim" />
            </TextField>
            <TextField fullWidth isRequired name="mother_name" variant="secondary" onChange={v => u('mother_name', v)} value={form.mother_name}>
              <Label>{t('form.motherName')}</Label>
              <Input placeholder="Ahmadova Nilufar" />
            </TextField>
          </div>

          {/* ── 2. Telefon & Email ── */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <TextField fullWidth isRequired name="phone" type="tel" variant="secondary" onChange={v => u('phone', v)} value={form.phone}>
              <Label>{t('form.phone')}</Label>
              <Input placeholder="+90 5XX XXX XX XX" />
            </TextField>
            <TextField fullWidth name="email" type="email" variant="secondary" onChange={v => u('email', v)} value={form.email}>
              <Label>{t('form.email')}</Label>
              <Input placeholder="email@example.com" />
            </TextField>
          </div>

          {/* ── 3. Manzil ── */}
          <TextField fullWidth name="address" variant="secondary" onChange={v => u('address', v)} value={form.address}>
            <Label>{t('form.address')} <span className="text-muted text-xs font-normal">({t('common.optional')})</span></Label>
            <Input placeholder="Konut adresi, mahalle, sokak, no" />
          </TextField>

          {/* ── 4. Sug'urta (w-fit - faqat Ha/Yo'q) ── */}
          <div className="flex flex-col gap-1.5">
            <Label>{t('form.insurance')}</Label>
            <Select value={form.has_insurance || ''} onValueChange={v => u('has_insurance', v)}>
              <SelectTrigger className="w-fit">
                <SelectValue placeholder={t('common.select')} />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="yes">{t('form.insuranceYes')}</SelectItem>
                <SelectItem value="no">{t('form.insuranceNo')}</SelectItem>
              </SelectContent>
            </Select>
          </div>

          {/* ── 5. Hujjatlar (pastda, fayl yuklash) ── */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
            <PassportUploadField
              label={t('form.passport')}
              accept="image/*,.pdf"
              onChange={(value) => {
                setPassportMeta(value);
                u('passport_url', value?.storageUrl || '');
              }}
            />
            <FileUpload label={t('form.photo')} onUpload={(url) => u('photo_url', url)} accept="image/*" />
          </div>

          {/* ── Talaba guvohnomasi (faqat o'quvchi) ── */}
          {type === 'ogrenci' && <FileUpload label={t('form.studentCert')} onUpload={(url) => u('student_cert_url', url)} accept="image/*,.pdf" />}

          {/* ── Oila hujjatlari ── */}
          {type === 'aile' && (
            <div className="space-y-5 border-t border-default/20 pt-5">
              <h3 className="font-heading font-bold text-base">{t('form.supporterDocs')}</h3>
              <FileUpload label={t('form.studentCert')} onUpload={url => u('student_cert_url', url)} accept="image/*,.pdf" />
              <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                <FileUpload label={t('form.supporterIdFront')} onUpload={url => u('supporter_id_front_url', url)} accept="image/*" />
                <FileUpload label={t('form.supporterIdBack')} onUpload={url => u('supporter_id_back_url', url)} accept="image/*" />
              </div>
              <div className="space-y-2">
                <Label>{t('form.supporterType')}</Label>
                <TabSelector tabs={[{ key: 'yabanci', label: t('form.supporterTypeForeign') }, { key: 'turk', label: t('form.supporterTypeTurkish') }]} value={supporterType} onChange={setSupporterType} />
              </div>
              {supporterType === 'yabanci' && (
                <PassportUploadField
                  label={t('form.supporterPassport')}
                  accept="image/*,.pdf"
                  onChange={(value) => {
                    setSupporterPassportMeta(value);
                    u('supporter_passport_url', value?.storageUrl || '');
                  }}
                />
              )}
              <FileUpload label={t('form.supporterStudentCert')} onUpload={url => u('supporter_student_cert_url', url)} accept="image/*,.pdf" />
            </div>
          )}

          {/* ── Submit ── */}
          <SubmitButton isPending={loading} />
        </Surface>
      </form>
    </motion.div>
  );
}
