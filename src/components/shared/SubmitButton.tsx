import { Loader2 } from 'lucide-react';
import { useTranslation } from 'react-i18next';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';

interface SubmitButtonProps {
  isPending?: boolean;
  isDisabled?: boolean;
  className?: string;
  pendingText?: string;
}

export function SubmitButton({ isPending, isDisabled, className, pendingText }: SubmitButtonProps) {
  const { t } = useTranslation();

  return (
    <div className="flex w-full justify-center pt-2">
      <Button
        type="submit"
        disabled={isDisabled || isPending}
        className={cn(
          "mx-auto h-12 w-fit shrink-0 rounded-2xl bg-black px-6 font-bold text-white shadow-lg hover:bg-black/90",
          className,
        )}
      >
        <>
          {isPending && <Loader2 className="h-4 w-4 animate-spin" />}
          {isPending ? pendingText || t('common.loading') : t('common.submit')}
        </>
      </Button>
    </div>
  );
}
