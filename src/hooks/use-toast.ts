import * as React from 'react';
import { sileo } from 'sileo';
import i18n from '@/i18n/config';

type ToastVariant = 'default' | 'destructive';

type Toast = {
  title?: React.ReactNode;
  description?: React.ReactNode;
  variant?: ToastVariant;
  action?: {
    altText?: string;
    onClick?: () => void;
    children?: React.ReactNode;
  };
};

const POSITION = 'top-center' as const;

const toPlainText = (value?: React.ReactNode) => {
  if (typeof value === 'string') return value;
  if (typeof value === 'number') return String(value);
  return undefined;
};

const buildButton = (action?: Toast['action']) => {
  if (!action?.onClick) return undefined;

  return {
    title: toPlainText(action.children) || action.altText || i18n.t('common.action'),
    onClick: action.onClick,
  };
};

function showToast(props: Toast) {
  const options = {
    title: toPlainText(props.title),
    description: props.description,
    position: POSITION,
    button: buildButton(props.action),
  };

  return props.variant === 'destructive'
    ? sileo.error(options)
    : sileo.show(options);
}

function toast(props: Toast) {
  const id = showToast(props);

  return {
    id,
    dismiss: () => sileo.dismiss(id),
    update: (next: Toast) => {
      sileo.dismiss(id);
      return toast({ ...props, ...next });
    },
  };
}

function useToast() {
  return React.useMemo(() => ({
    toasts: [],
    toast,
    dismiss: (toastId?: string) => {
      if (toastId) {
        sileo.dismiss(toastId);
        return;
      }

      sileo.clear(POSITION);
    },
  }), []);
}

export { useToast, toast };
