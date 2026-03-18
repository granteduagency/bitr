import { type LucideIcon, ArrowUpRight } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { motion } from 'framer-motion';

interface ServiceCardProps {
  icon: LucideIcon;
  title: string;
  href: string;
  color: string;
  bgColor: string;
  onClick?: () => void;
  index?: number;
}

export function ServiceCard({ icon: Icon, title, href, color, bgColor, onClick, index = 0 }: ServiceCardProps) {
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
      transition={{ delay: index * 0.06, duration: 0.45, ease: [0.16, 1, 0.3, 1] }}
      className="relative overflow-hidden rounded-[1.5rem] p-5 cursor-pointer group transition-all duration-300 hover:shadow-lg hover:-translate-y-1 min-h-[180px] md:min-h-[200px] flex flex-col justify-between"
      style={{ backgroundColor: bgColor }}
      onClick={handleClick}
    >
      <div className="flex flex-col gap-2">
        <Icon className="h-7 w-7 mb-1" style={{ color }} strokeWidth={1.8} />
        <span className="font-heading font-bold text-[0.9rem] leading-snug text-slate-800">
          {title}
        </span>
      </div>

      {/* Arrow button */}
      <div className="flex justify-end mt-3">
        <div
          className="w-9 h-9 rounded-full flex items-center justify-center transition-transform duration-300 group-hover:scale-110"
          style={{ backgroundColor: color, color: '#fff' }}
        >
          <ArrowUpRight className="w-4 h-4" strokeWidth={2.5} />
        </div>
      </div>
    </motion.div>
  );
}
