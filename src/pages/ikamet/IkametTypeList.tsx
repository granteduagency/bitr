import { useTranslation } from 'react-i18next';
import { useNavigate } from 'react-router-dom';
import { GraduationCap, Users, Clock, Calendar, ChevronRight } from 'lucide-react';
import { motion } from 'framer-motion';

interface IkametTypeListProps {
  basePath: string;
  showUzunDonem?: boolean;
}

export default function IkametTypeList({ basePath, showUzunDonem = true }: IkametTypeListProps) {
  const { t } = useTranslation();
  const navigate = useNavigate();

  const items = [
    { icon: GraduationCap, label: t('ikamet.ogrenci'), path: `${basePath}/ogrenci`, color: '#3B82F6' },
    { icon: Users, label: t('ikamet.aile'), path: `${basePath}/aile`, color: '#10B981' },
    { icon: Clock, label: t('ikamet.kisaDonem'), path: `${basePath}/kisa-donem`, color: '#F59E0B' },
    ...(showUzunDonem ? [{ icon: Calendar, label: t('ikamet.uzunDonem'), path: `${basePath}/uzun-donem`, color: '#8B5CF6' }] : []),
  ];

  const title = basePath.includes('uzatma') ? t('ikamet.uzatma') : basePath.includes('gecis') ? t('ikamet.gecis') : t('ikamet.ilkKez');

  return (
    <div className="space-y-5 pb-24 lg:pb-6">
      <motion.h2 initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="page-header">{title}</motion.h2>
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
    </div>
  );
}
