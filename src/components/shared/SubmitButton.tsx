import { Button, Spinner } from '@heroui/react';
import { useTranslation } from 'react-i18next';

interface SubmitButtonProps {
  isPending?: boolean;
  isDisabled?: boolean;
  className?: string;
}

export function SubmitButton({ isPending, isDisabled, className }: SubmitButtonProps) {
  const { t } = useTranslation();

  return (
    <Button
      type="submit"
      fullWidth
      isPending={isPending}
      isDisabled={isDisabled}
      className={className}
      render={(props, { isPressed }) => (
        <button
          {...props}
          // Use the custom render pattern requested by the user
          data-custom={isPressed ? "pressed" : "bar"}
        />
      )}
    >
      {({ isPending }) => (
        <>
          {isPending && <Spinner color="current" size="sm" />}
          {isPending ? t('common.loading') : t('common.submit')}
        </>
      )}
    </Button>
  );
}
