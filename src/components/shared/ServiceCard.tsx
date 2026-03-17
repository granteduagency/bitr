import { type LucideIcon } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { motion } from 'framer-motion';

interface ServiceCardProps {
  icon: LucideIcon;
  title: string;
  href: string;
  color: string;
  onClick?: () => void;
  index?: number;
}

export function ServiceCard({ icon: Icon, title, href, color, onClick, index = 0 }: ServiceCardProps) {
  const navigate = useNavigate();

  const handleClick = () => {
    if (onClick) {
      onClick();
    } else {
      navigate(href);
    }
  };

  return (
    <motion.div
      initial={{ opacity: 0, y: 16 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: index * 0.05, duration: 0.4, ease: [0.16, 1, 0.3, 1] }}
      className="service-card"
      onClick={handleClick}
    >
      <div className="flex flex-col items-center justify-center gap-3.5 text-center py-2">
        <div
          className="w-14 h-14 rounded-2xl flex items-center justify-center transition-transform duration-300 group-hover:scale-110"
          style={{
            background: `linear-gradient(135deg, ${color}18, ${color}28)`,
            color,
            boxShadow: `0 4px 12px ${color}20`,
          }}
        >
          <Icon className="h-6 w-6" strokeWidth={2} />
        </div>
        <span className="font-heading font-bold text-sm leading-tight">{title}</span>
      </div>
    </motion.div>
  );
}
