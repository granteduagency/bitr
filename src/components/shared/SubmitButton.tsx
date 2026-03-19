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
    <Button
      type="submit"
      disabled={isDisabled || isPending}
      className={cn("w-full", className)}
    >
      <>
        {isPending && <Loader2 className="h-4 w-4 animate-spin" />}
        {isPending ? pendingText || t('common.loading') : t('common.submit')}
      </>
    </Button>
  );
}
