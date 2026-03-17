import { useTranslation } from 'react-i18next';
import { useNavigate } from 'react-router-dom';
import { HeartPulse, Plane, Mountain, Car, Palmtree, ChevronRight } from 'lucide-react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { useState } from 'react';
import { motion } from 'framer-motion';

export default function SigortaMain() {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const [saglikOpen, setSaglikOpen] = useState(false);
  const [aracOpen, setAracOpen] = useState(false);

  const items = [
    { icon: HeartPulse, label: t('sigorta.saglik'), color: '#EF4444', onClick: () => setSaglikOpen(true) },
    { icon: Plane, label: t('sigorta.seyahat'), color: '#0EA5E9', path: '/dashboard/sigorta/seyahat' },
    { icon: Mountain, label: t('sigorta.deprem'), color: '#F59E0B', path: '/dashboard/sigorta/deprem' },
    { icon: Car, label: t('sigorta.arac'), color: '#6366F1', onClick: () => setAracOpen(true) },
    { icon: Palmtree, label: t('sigorta.turizm'), color: '#10B981', path: '/dashboard/sigorta/turizm' },
  ];

  return (
    <div className="space-y-5 pb-24 lg:pb-6">
      <motion.h2 initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="page-header">{t('sigorta.title')}</motion.h2>
      <div className="grid gap-3">
        {items.map((item, i) => (
          <motion.div key={item.label}
            initial={{ opacity: 0, x: -16 }} animate={{ opacity: 1, x: 0 }}
            transition={{ delay: i * 0.08, duration: 0.4, ease: [0.16, 1, 0.3, 1] }}
            className="service-card !p-0"
            onClick={() => item.onClick ? item.onClick() : item.path && navigate(item.path)}>
            <div className="flex items-center gap-4 p-4">
              <div className="w-12 h-12 rounded-xl flex items-center justify-center shrink-0"
                style={{ background: `linear-gradient(135deg, ${item.color}20, ${item.color}30)`, color: item.color }}>
                <item.icon className="h-6 w-6" />
              </div>
              <span className="font-heading font-bold flex-1">{item.label}</span>
              <ChevronRight className="h-5 w-5 text-muted-foreground" />
            </div>
          </motion.div>
        ))}
      </div>

      <Dialog open={saglikOpen} onOpenChange={setSaglikOpen}>
        <DialogContent className="rounded-2xl">
          <DialogHeader><DialogTitle className="font-heading">{t('sigorta.saglik')}</DialogTitle></DialogHeader>
          <div className="flex flex-col gap-3 pt-2">
            <Button variant="outline" className="h-14 rounded-xl justify-start gap-3 text-base hover:border-primary/30"
              onClick={() => { setSaglikOpen(false); navigate('/dashboard/sigorta/saglik?type=yabanci'); }}>
              <div className="w-9 h-9 rounded-lg bg-info/10 flex items-center justify-center"><HeartPulse className="h-5 w-5 text-info" /></div>
              {t('form.foreign')}</Button>
            <Button variant="outline" className="h-14 rounded-xl justify-start gap-3 text-base hover:border-success/30"
              onClick={() => { setSaglikOpen(false); navigate('/dashboard/sigorta/saglik?type=turk'); }}>
              <div className="w-9 h-9 rounded-lg bg-success/10 flex items-center justify-center"><HeartPulse className="h-5 w-5 text-success" /></div>
              {t('form.turkish')}</Button>
          </div>
        </DialogContent>
      </Dialog>

      <Dialog open={aracOpen} onOpenChange={setAracOpen}>
        <DialogContent className="rounded-2xl">
          <DialogHeader><DialogTitle className="font-heading">{t('sigorta.arac')}</DialogTitle></DialogHeader>
          <div className="flex flex-col gap-3 pt-2">
            <Button variant="outline" className="h-14 rounded-xl justify-start gap-3 text-base hover:border-primary/30"
              onClick={() => { setAracOpen(false); navigate('/dashboard/sigorta/arac/trafik'); }}>
              <div className="w-9 h-9 rounded-lg bg-primary/10 flex items-center justify-center"><Car className="h-5 w-5 text-primary" /></div>
              {t('sigorta.trafik')}</Button>
            <Button variant="outline" className="h-14 rounded-xl justify-start gap-3 text-base hover:border-accent/30"
              onClick={() => { setAracOpen(false); navigate('/dashboard/sigorta/arac/kasko'); }}>
              <div className="w-9 h-9 rounded-lg bg-accent/10 flex items-center justify-center"><Car className="h-5 w-5 text-accent" /></div>
              {t('sigorta.kasko')}</Button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
