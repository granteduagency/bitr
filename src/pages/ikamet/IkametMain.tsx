import { useTranslation } from 'react-i18next';
import { useNavigate } from 'react-router-dom';
import { Shield, RefreshCw, ArrowRightLeft, Search, ChevronRight } from 'lucide-react';
import { motion } from 'framer-motion';

export default function IkametMain() {
  const { t } = useTranslation();
  const navigate = useNavigate();

  const items = [
    { icon: Shield, label: t('ikamet.ilkKez'), path: '/dashboard/ikamet/ilk-kez', color: '#3B82F6', desc: '' },
    { icon: RefreshCw, label: t('ikamet.uzatma'), path: '/dashboard/ikamet/uzatma', color: '#10B981', desc: '' },
    { icon: ArrowRightLeft, label: t('ikamet.gecis'), path: '/dashboard/ikamet/gecis', color: '#8B5CF6', desc: '' },
    { icon: Search, label: t('ikamet.sonuc'), path: '/dashboard/ikamet/sonuc', color: '#F59E0B', desc: '' },
  ];

  return (
    <div className="space-y-5 pb-24 lg:pb-6">
      <motion.h2 initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="page-header">{t('ikamet.title')}</motion.h2>
      <div className="grid gap-3">
        {items.map((item, i) => (
          <motion.div
            key={item.path}
            initial={{ opacity: 0, x: -16 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ delay: i * 0.08, duration: 0.4, ease: [0.16, 1, 0.3, 1] }}
            className="service-card !p-0"
            onClick={() => navigate(item.path)}
          >
            <div className="flex items-center gap-4 p-4">
              <div
                className="w-12 h-12 rounded-xl flex items-center justify-center shrink-0"
                style={{ background: `linear-gradient(135deg, ${item.color}20, ${item.color}30)`, color: item.color }}
              >
                <item.icon className="h-6 w-6" />
              </div>
              <span className="font-heading font-bold flex-1">{item.label}</span>
              <ChevronRight className="h-5 w-5 text-muted-foreground" />
            </div>
          </motion.div>
        ))}
      </div>
    </div>
  );
}
