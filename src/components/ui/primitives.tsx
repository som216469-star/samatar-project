import React, { useEffect } from 'react';
import {
  X,
  AlertCircle,
  CheckCircle2,
  Info,
  AlertTriangle,
  Inbox,
  RefreshCw,
  Loader2
} from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';

/* ============================================================================
   1. BUTTON PRIMITIVE
   ============================================================================ */
export type ButtonVariant = 'primary' | 'secondary' | 'outline' | 'ghost' | 'danger' | 'success';
export type ButtonSize = 'xs' | 'sm' | 'md' | 'lg';

export interface ButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: ButtonVariant;
  size?: ButtonSize;
  loading?: boolean;
  isLoading?: boolean;
  icon?: React.ReactNode;
  leftIcon?: React.ReactNode;
  rightIcon?: React.ReactNode;
  fullWidth?: boolean;
}

export const Button: React.FC<ButtonProps> = ({
  variant = 'primary',
  size = 'md',
  loading = false,
  isLoading = false,
  icon,
  leftIcon,
  rightIcon,
  fullWidth = false,
  className = '',
  children,
  disabled,
  type = 'button',
  ...rest
}) => {
  const resolvedLoading = Boolean(loading || isLoading);
  const resolvedLeftIcon = icon ?? leftIcon;

  const sizeStyles: Record<ButtonSize, string> = {
    xs: 'px-2.5 py-1 text-[11px] gap-1.5 rounded-[var(--radius-xs)]',
    sm: 'px-3 py-1.5 text-xs gap-1.5 rounded-[var(--radius-sm)]',
    md: 'px-4 py-2 text-xs gap-2 rounded-[var(--radius-sm)]',
    lg: 'px-5 py-2.5 text-sm gap-2.5 rounded-[var(--radius-md)]'
  };

  const variantStyles: Record<ButtonVariant, string> = {
    primary:
      'bg-[var(--color-brand)] hover:bg-[var(--color-brand-hover)] text-white border border-transparent shadow-xs',
    secondary:
      'bg-[var(--color-surface-muted)] hover:bg-[var(--color-surface-hover)] text-[var(--color-text-primary)] border border-[var(--color-border)]',
    outline:
      'bg-transparent hover:bg-[var(--color-surface-hover)] text-[var(--color-text-primary)] border border-[var(--color-border-strong)]',
    ghost:
      'bg-transparent hover:bg-[var(--color-surface-hover)] text-[var(--color-text-secondary)] hover:text-[var(--color-text-primary)] border border-transparent',
    danger:
      'bg-[var(--color-danger)] hover:opacity-90 text-white border border-transparent shadow-xs',
    success:
      'bg-[var(--color-success)] hover:opacity-90 text-white border border-transparent shadow-xs'
  };

  return (
    <button
      type={type}
      disabled={disabled || resolvedLoading}
      className={`inline-flex items-center justify-center font-semibold tracking-tight transition-all cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed ${sizeStyles[size]} ${variantStyles[variant]} ${
        fullWidth ? 'w-full' : ''
      } ${className}`}
      {...rest}
    >
      {resolvedLoading ? <Loader2 className="w-3.5 h-3.5 animate-spin shrink-0" /> : resolvedLeftIcon}
      {children && <span>{children}</span>}
      {!resolvedLoading && rightIcon}
    </button>
  );
};

/* ============================================================================
   2. STATUS BADGE PRIMITIVE (Never color-only: includes status dot or icon)
   ============================================================================ */
export type BadgeTone = 'success' | 'warning' | 'danger' | 'info' | 'brand' | 'neutral';

export interface StatusBadgeProps {
  tone?: BadgeTone;
  variant?: BadgeTone;
  children: React.ReactNode;
  dot?: boolean;
  icon?: React.ReactNode;
  className?: string;
}

export const StatusBadge: React.FC<StatusBadgeProps> = ({
  tone,
  variant,
  children,
  dot = true,
  icon,
  className = ''
}) => {
  const resolvedTone: BadgeTone = tone || variant || 'neutral';
  const toneStyles: Record<BadgeTone, string> = {
    success:
      'bg-[var(--color-success-soft)] text-[var(--color-success)] border-[var(--color-success-border)]',
    warning:
      'bg-[var(--color-warning-soft)] text-[var(--color-warning)] border-[var(--color-warning-border)]',
    danger:
      'bg-[var(--color-danger-soft)] text-[var(--color-danger)] border-[var(--color-danger-border)]',
    info:
      'bg-[var(--color-info-soft)] text-[var(--color-info)] border-[var(--color-info-border)]',
    brand:
      'bg-[var(--color-brand-soft)] text-[var(--color-brand)] border-[var(--color-brand-border)]',
    neutral:
      'bg-[var(--color-surface-muted)] text-[var(--color-text-secondary)] border-[var(--color-border)]'
  };

  const dotColors: Record<BadgeTone, string> = {
    success: 'bg-[var(--color-success)]',
    warning: 'bg-[var(--color-warning)]',
    danger: 'bg-[var(--color-danger)]',
    info: 'bg-[var(--color-info)]',
    brand: 'bg-[var(--color-brand)]',
    neutral: 'bg-[var(--color-text-muted)]'
  };

  return (
    <span
      className={`inline-flex items-center gap-1.5 px-2 py-0.5 text-[11px] font-semibold rounded-[var(--radius-xs)] border ${toneStyles[resolvedTone]} ${className}`}
    >
      {icon ? (
        icon
      ) : dot ? (
        <span className={`w-1.5 h-1.5 rounded-full shrink-0 ${dotColors[resolvedTone]}`} aria-hidden="true" />
      ) : null}
      <span>{children}</span>
    </span>
  );
};

export const Badge: React.FC<StatusBadgeProps> = ({ dot = false, ...props }) => (
  <StatusBadge dot={dot} {...props} />
);

/* ============================================================================
   3. CARD & STAT CARD PRIMITIVES
   ============================================================================ */
export interface CardProps {
  children: React.ReactNode;
  className?: string;
  padding?: 'none' | 'sm' | 'md' | 'lg';
  elevated?: boolean;
  onClick?: () => void;
}

export const Card: React.FC<CardProps> = ({
  children,
  className = '',
  padding = 'md',
  elevated = false,
  onClick
}) => {
  const padMap = {
    none: '',
    sm: 'p-3.5',
    md: 'p-5',
    lg: 'p-6'
  };

  return (
    <div
      onClick={onClick}
      className={`${elevated ? 'ds-surface-elevated' : 'ds-surface'} ${padMap[padding]} ${
        onClick ? 'cursor-pointer hover:border-[var(--color-brand-border)] transition-colors' : ''
      } ${className}`}
    >
      {children}
    </div>
  );
};

export interface StatCardProps {
  label: string;
  value: React.ReactNode;
  subtitle?: React.ReactNode;
  trend?: {
    label: string;
    tone?: BadgeTone;
  };
  icon?: React.ReactNode;
  tone?: BadgeTone | 'emerald' | 'default';
  onClick?: () => void;
}

export const StatCard: React.FC<StatCardProps> = ({
  label,
  value,
  subtitle,
  trend,
  icon,
  tone = 'brand',
  onClick
}) => {
  const normalizedTone: BadgeTone =
    tone === 'emerald'
      ? 'success'
      : tone === 'default'
      ? 'neutral'
      : (tone as BadgeTone);
  const iconToneMap: Record<BadgeTone, string> = {
    brand: 'bg-[var(--color-brand-soft)] text-[var(--color-brand)] border-[var(--color-brand-border)]',
    success: 'bg-[var(--color-success-soft)] text-[var(--color-success)] border-[var(--color-success-border)]',
    warning: 'bg-[var(--color-warning-soft)] text-[var(--color-warning)] border-[var(--color-warning-border)]',
    danger: 'bg-[var(--color-danger-soft)] text-[var(--color-danger)] border-[var(--color-danger-border)]',
    info: 'bg-[var(--color-info-soft)] text-[var(--color-info)] border-[var(--color-info-border)]',
    neutral: 'bg-[var(--color-surface-muted)] text-[var(--color-text-secondary)] border-[var(--color-border)]'
  };

  return (
    <Card
      onClick={onClick}
      className="flex flex-col justify-between gap-3 transition-all hover:border-[var(--color-border-strong)]"
    >
      <div className="flex items-start justify-between gap-3">
        <span className="text-[11px] font-semibold uppercase tracking-wider text-[var(--color-text-muted)]">
          {label}
        </span>
        {icon && (
          <div className={`w-8 h-8 rounded-[var(--radius-sm)] border flex items-center justify-center shrink-0 ${iconToneMap[normalizedTone]}`}>
            {icon}
          </div>
        )}
      </div>

      <div className="space-y-1">
        <div className="text-2xl sm:text-3xl font-bold tracking-tight font-mono tabular-nums text-[var(--color-text-primary)]">
          {value}
        </div>
        {(subtitle || trend) && (
          <div className="flex items-center justify-between gap-2 pt-1">
            {subtitle && (
              <span className="text-xs text-[var(--color-text-secondary)] truncate">{subtitle}</span>
            )}
            {trend && (
              <StatusBadge tone={trend.tone || 'neutral'} dot={false}>
                {trend.label}
              </StatusBadge>
            )}
          </div>
        )}
      </div>
    </Card>
  );
};

/* ============================================================================
   4. FORM PRIMITIVES (FormField, FormSection, Input, Select)
   ============================================================================ */
export interface FormFieldProps {
  label: string;
  htmlFor?: string;
  required?: boolean;
  hint?: string;
  error?: string;
  children: React.ReactNode;
  className?: string;
}

export const FormField: React.FC<FormFieldProps> = ({
  label,
  htmlFor,
  required,
  hint,
  error,
  children,
  className = ''
}) => (
  <div className={`space-y-1.5 ${className}`}>
    <label
      htmlFor={htmlFor}
      className="block text-xs font-semibold text-[var(--color-text-secondary)]"
    >
      {label}
      {required && <span className="text-[var(--color-danger)] ml-1" aria-hidden="true">*</span>}
    </label>
    {children}
    {error ? (
      <p className="text-[11px] font-medium text-[var(--color-danger)] flex items-center gap-1" role="alert">
        <AlertCircle className="w-3 h-3 shrink-0" />
        <span>{error}</span>
      </p>
    ) : hint ? (
      <p className="text-[11px] text-[var(--color-text-muted)]">{hint}</p>
    ) : null}
  </div>
);

export interface FormSectionProps {
  title: string;
  description?: string;
  icon?: React.ReactNode;
  children: React.ReactNode;
  className?: string;
}

export const FormSection: React.FC<FormSectionProps> = ({
  title,
  description,
  icon,
  children,
  className = ''
}) => (
  <div className={`ds-surface p-5 space-y-4 ${className}`}>
    <div className="border-b border-[var(--color-border)] pb-3 flex items-start gap-2.5">
      {icon && <div className="text-[var(--color-brand)] mt-0.5">{icon}</div>}
      <div>
        <h3 className="text-sm font-bold text-[var(--color-text-primary)]">{title}</h3>
        {description && (
          <p className="text-xs text-[var(--color-text-muted)] mt-0.5">{description}</p>
        )}
      </div>
    </div>
    <div className="space-y-4">{children}</div>
  </div>
);

/* ============================================================================
   5. OVERLAY PRIMITIVES (Modal, Drawer, ConfirmDialog)
   ============================================================================ */
export interface ModalProps {
  isOpen: boolean;
  onClose: () => void;
  title: string;
  subtitle?: string;
  children: React.ReactNode;
  footer?: React.ReactNode;
  size?: 'sm' | 'md' | 'lg' | 'xl';
}

export const Modal: React.FC<ModalProps> = ({
  isOpen,
  onClose,
  title,
  subtitle,
  children,
  footer,
  size = 'md'
}) => {
  useEffect(() => {
    if (!isOpen) return;
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isOpen, onClose]);

  const sizeClasses = {
    sm: 'max-w-md',
    md: 'max-w-lg',
    lg: 'max-w-2xl',
    xl: 'max-w-4xl'
  };

  return (
    <AnimatePresence>
      {isOpen && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/70 backdrop-blur-xs overflow-y-auto"
          role="dialog"
          aria-modal="true"
          aria-labelledby="modal-title"
        >
          <motion.div
            initial={{ opacity: 0, scale: 0.97, y: 8 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.97, y: 8 }}
            transition={{ duration: 0.18 }}
            className={`ds-surface-elevated w-full ${sizeClasses[size]} overflow-hidden my-8`}
          >
            <div className="px-6 py-4 border-b border-[var(--color-border)] flex items-center justify-between gap-4">
              <div>
                <h2 id="modal-title" className="text-base font-bold text-[var(--color-text-primary)]">
                  {title}
                </h2>
                {subtitle && (
                  <p className="text-xs text-[var(--color-text-muted)] mt-0.5">{subtitle}</p>
                )}
              </div>
              <button
                type="button"
                onClick={onClose}
                aria-label="Close dialog"
                className="p-1.5 rounded-[var(--radius-sm)] text-[var(--color-text-muted)] hover:text-[var(--color-text-primary)] hover:bg-[var(--color-surface-hover)] transition-colors cursor-pointer"
              >
                <X className="w-4 h-4" />
              </button>
            </div>
            <div className="p-6 max-h-[75vh] overflow-y-auto">{children}</div>
            {footer && (
              <div className="px-6 py-3.5 bg-[var(--color-surface-muted)] border-t border-[var(--color-border)] flex items-center justify-end gap-2.5">
                {footer}
              </div>
            )}
          </motion.div>
        </div>
      )}
    </AnimatePresence>
  );
};

export interface ConfirmDialogProps {
  isOpen?: boolean;
  open?: boolean;
  title: string;
  message?: string;
  description?: string;
  confirmLabel?: string;
  cancelLabel?: string;
  tone?: 'danger' | 'warning' | 'brand' | 'primary';
  variant?: 'danger' | 'warning' | 'brand' | 'primary';
  isLoading?: boolean;
  onConfirm: () => void | Promise<void>;
  onCancel: () => void;
}

export const ConfirmDialog: React.FC<ConfirmDialogProps> = ({
  isOpen,
  open,
  title,
  message,
  description,
  confirmLabel = 'Confirm',
  cancelLabel = 'Cancel',
  tone,
  variant,
  isLoading = false,
  onConfirm,
  onCancel
}) => {
  const resolvedOpen = Boolean(isOpen ?? open);
  const resolvedTone = tone || variant || 'danger';
  const resolvedMessage = message || description || '';

  return (
    <Modal
      isOpen={resolvedOpen}
      onClose={onCancel}
      title={title}
      size="sm"
      footer={
        <>
          <Button variant="secondary" size="sm" onClick={onCancel} disabled={isLoading}>
            {cancelLabel}
          </Button>
          <Button
            variant={resolvedTone === 'danger' ? 'danger' : 'primary'}
            size="sm"
            loading={isLoading}
            onClick={onConfirm}
          >
            {confirmLabel}
          </Button>
        </>
      }
    >
      <div className="flex items-start gap-3.5">
        <div
          className={`w-9 h-9 rounded-full flex items-center justify-center shrink-0 ${
            resolvedTone === 'danger'
              ? 'bg-[var(--color-danger-soft)] text-[var(--color-danger)]'
              : 'bg-[var(--color-warning-soft)] text-[var(--color-warning)]'
          }`}
        >
          <AlertTriangle className="w-4 h-4" />
        </div>
        <p className="text-xs leading-relaxed text-[var(--color-text-secondary)] pt-1">
          {resolvedMessage}
        </p>
      </div>
    </Modal>
  );
};

/* ============================================================================
   6. LOADING / EMPTY / ERROR STATES & SKELETON
   ============================================================================ */
export const Skeleton: React.FC<{ className?: string }> = ({ className = 'h-4 w-full' }) => (
  <div
    className={`animate-pulse rounded-[var(--radius-xs)] bg-[var(--color-surface-hover)] ${className}`}
    aria-hidden="true"
  />
);

export const LoadingState: React.FC<{ label?: string; rows?: number }> = ({
  label = 'Loading institutional records...',
  rows = 4
}) => (
  <div className="ds-surface p-6 space-y-4" role="status" aria-live="polite">
    <div className="flex items-center gap-2.5 text-xs font-medium text-[var(--color-text-secondary)]">
      <Loader2 className="w-4 h-4 animate-spin text-[var(--color-brand)]" />
      <span>{label}</span>
    </div>
    <div className="space-y-2.5">
      {Array.from({ length: rows }).map((_, idx) => (
        <Skeleton key={idx} className="h-10 w-full" />
      ))}
    </div>
  </div>
);

export interface EmptyStateProps {
  title: string;
  description?: string;
  icon?: React.ReactNode;
  action?: React.ReactNode;
}

export const EmptyState: React.FC<EmptyStateProps> = ({
  title,
  description,
  icon,
  action
}) => (
  <div className="ds-surface p-10 text-center flex flex-col items-center justify-center gap-3">
    <div className="w-11 h-11 rounded-full bg-[var(--color-surface-muted)] border border-[var(--color-border)] flex items-center justify-center text-[var(--color-text-muted)]">
      {icon || <Inbox className="w-5 h-5" />}
    </div>
    <div className="max-w-md space-y-1">
      <h3 className="text-sm font-bold text-[var(--color-text-primary)]">{title}</h3>
      {description && (
        <p className="text-xs text-[var(--color-text-muted)] leading-relaxed">{description}</p>
      )}
    </div>
    {action && <div className="pt-2">{action}</div>}
  </div>
);

export interface ErrorStateProps {
  title?: string;
  message: string;
  onRetry?: () => void;
}

export const ErrorState: React.FC<ErrorStateProps> = ({
  title = 'Unable to load data',
  message,
  onRetry
}) => (
  <div className="ds-surface p-6 border-[var(--color-danger-border)] bg-[var(--color-danger-soft)] flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4" role="alert">
    <div className="flex items-start gap-3">
      <AlertCircle className="w-5 h-5 text-[var(--color-danger)] shrink-0 mt-0.5" />
      <div>
        <h3 className="text-sm font-bold text-[var(--color-text-primary)]">{title}</h3>
        <p className="text-xs text-[var(--color-text-secondary)] mt-0.5">{message}</p>
      </div>
    </div>
    {onRetry && (
      <Button
        variant="secondary"
        size="sm"
        icon={<RefreshCw className="w-3.5 h-3.5" />}
        onClick={onRetry}
      >
        Retry
      </Button>
    )}
  </div>
);

/* ============================================================================
   7. UNIFIED TOAST NOTIFICATION CONTAINER
   ============================================================================ */
export interface ToastItem {
  id: string;
  message: string;
  type: 'success' | 'error' | 'info' | 'warning';
}

export const ToastContainer: React.FC<{
  toasts: ToastItem[];
  onDismiss: (id: string) => void;
}> = ({ toasts, onDismiss }) => {
  const iconMap = {
    success: <CheckCircle2 className="w-4 h-4 text-[var(--color-success)] shrink-0" />,
    error: <AlertCircle className="w-4 h-4 text-[var(--color-danger)] shrink-0" />,
    warning: <AlertTriangle className="w-4 h-4 text-[var(--color-warning)] shrink-0" />,
    info: <Info className="w-4 h-4 text-[var(--color-info)] shrink-0" />
  };

  return (
    <div
      className="fixed top-4 right-4 z-[100] flex flex-col gap-2 max-w-sm w-full pointer-events-none px-4 sm:px-0"
      aria-live="polite"
    >
      <AnimatePresence>
        {toasts.map((toast) => (
          <motion.div
            key={toast.id}
            initial={{ opacity: 0, y: -12, scale: 0.96 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, x: 24, scale: 0.96 }}
            transition={{ duration: 0.18 }}
            className="pointer-events-auto ds-surface-elevated px-4 py-3 flex items-start gap-3 shadow-lg"
            role="status"
          >
            <div className="mt-0.5">{iconMap[toast.type]}</div>
            <p className="text-xs font-medium text-[var(--color-text-primary)] flex-1 leading-relaxed">
              {toast.message}
            </p>
            <button
              type="button"
              onClick={() => onDismiss(toast.id)}
              aria-label="Dismiss notification"
              className="text-[var(--color-text-muted)] hover:text-[var(--color-text-primary)] p-0.5 cursor-pointer"
            >
              <X className="w-3.5 h-3.5" />
            </button>
          </motion.div>
        ))}
      </AnimatePresence>
    </div>
  );
};
