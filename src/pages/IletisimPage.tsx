import { useTranslation } from 'react-i18next';
import { Card, CardContent } from '@/components/ui/card';
import { MapPin, Phone, Mail, Clock } from 'lucide-react';
import { motion } from 'framer-motion';

export default function IletisimPage() {
  const { t } = useTranslation();

  const items = [
    { icon: MapPin, label: t('iletisim.address'), value: t('iletisim.addressValue'), color: '#EF4444' },
    { icon: Phone, label: t('iletisim.phone'), value: t('iletisim.phoneValue'), color: '#3B82F6' },
    { icon: Mail, label: t('iletisim.email'), value: t('iletisim.emailValue'), color: '#10B981' },
    { icon: Clock, label: t('iletisim.workingHours'), value: t('iletisim.workingHoursValue'), color: '#F59E0B' },
  ];

  return (
    <div className="space-y-6 pb-24 lg:pb-6">
      <motion.h2 initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="page-header">{t('iletisim.title')}</motion.h2>
      <div className="space-y-3">
        {items.map((item, i) => (
          <motion.div key={item.label} initial={{ opacity: 0, x: -16 }} animate={{ opacity: 1, x: 0 }} transition={{ delay: i * 0.1 }}>
            <Card className="border-border/40 hover:shadow-md transition-all">
              <CardContent className="flex items-start gap-4 p-5">
                <div className="w-11 h-11 rounded-xl flex items-center justify-center shrink-0"
                  style={{ background: `${item.color}15`, color: item.color }}>
                  <item.icon className="h-5 w-5" />
                </div>
                <div><p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">{item.label}</p><p className="font-heading font-bold mt-0.5">{item.value}</p></div>
              </CardContent>
            </Card>
          </motion.div>
        ))}
      </div>
      <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: 0.4 }} className="space-y-3">
        <h3 className="font-heading font-bold">{t('iletisim.socialMedia')}</h3>
        <div className="flex gap-3">
          {['📱 WhatsApp', '💬 Telegram', '📷 Instagram', '📘 Facebook'].map((sm, i) => (
            <a key={i} href="#" className="flex items-center gap-2 px-4 py-3 rounded-xl bg-card border border-border/40 hover:border-primary/30 hover:shadow-md transition-all text-sm font-medium">
              {sm}
            </a>
          ))}
        </div>
      </motion.div>
    </div>
  );
}
