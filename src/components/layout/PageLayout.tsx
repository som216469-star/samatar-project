import React from 'react';
import { ChevronRight } from 'lucide-react';

/* ============================================================================
   PAGE ARCHITECTURE & LAYOUT PRIMITIVES
   ============================================================================ */

export interface BreadcrumbItem {
  label: string;
  onClick?: () => void;
}

export interface PageContainerProps {
  children: React.ReactNode;
  className?: string;
}

export const PageContainer: React.FC<PageContainerProps> = ({ children, className = '' }) => (
  <div className={`space-y-6 pb-10 ${className}`}>{children}</div>
);

export interface PageHeaderProps {
  title: string;
  subtitle?: string;
  breadcrumbs?: BreadcrumbItem[];
  badge?: React.ReactNode;
  actions?: React.ReactNode;
}

export const PageHeader: React.FC<PageHeaderProps> = ({
  title,
  subtitle,
  breadcrumbs,
  badge,
  actions
}) => (
  <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4 pb-4 border-b border-[var(--color-border)]">
    <div className="space-y-1">
      {breadcrumbs && breadcrumbs.length > 0 && (
        <nav aria-label="Breadcrumb" className="flex items-center gap-1.5 text-[11px] font-medium text-[var(--color-text-muted)] mb-1">
          {breadcrumbs.map((item, idx) => (
            <React.Fragment key={idx}>
              {idx > 0 && <ChevronRight className="w-3 h-3 opacity-60" />}
              {item.onClick ? (
                <button
                  type="button"
                  onClick={item.onClick}
                  className="hover:text-[var(--color-text-primary)] transition-colors cursor-pointer"
                >
                  {item.label}
                </button>
              ) : (
                <span className="text-[var(--color-text-secondary)] font-semibold">{item.label}</span>
              )}
            </React.Fragment>
          ))}
        </nav>
      )}
      <div className="flex items-center gap-2.5 flex-wrap">
        <h1 className="text-xl sm:text-2xl font-bold tracking-tight text-[var(--color-text-primary)]">
          {title}
        </h1>
        {badge}
      </div>
      {subtitle && (
        <p className="text-xs text-[var(--color-text-secondary)] max-w-2xl">{subtitle}</p>
      )}
    </div>
    {actions && (
      <div className="flex items-center gap-2 flex-wrap shrink-0">{actions}</div>
    )}
  </div>
);

export interface SectionProps {
  title?: string;
  subtitle?: string;
  actions?: React.ReactNode;
  children: React.ReactNode;
  className?: string;
  noCard?: boolean;
}

export const Section: React.FC<SectionProps> = ({
  title,
  subtitle,
  actions,
  children,
  className = '',
  noCard = false
}) => {
  const content = (
    <>
      {(title || actions) && (
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 pb-4 border-b border-[var(--color-border)] mb-4">
          <div>
            {title && (
              <h2 className="text-sm font-bold tracking-tight text-[var(--color-text-primary)]">
                {title}
              </h2>
            )}
            {subtitle && (
              <p className="text-xs text-[var(--color-text-muted)] mt-0.5">{subtitle}</p>
            )}
          </div>
          {actions && <div className="flex items-center gap-2 flex-wrap">{actions}</div>}
        </div>
      )}
      {children}
    </>
  );

  if (noCard) {
    return <section className={`space-y-4 ${className}`}>{content}</section>;
  }

  return <section className={`ds-surface p-5 ${className}`}>{content}</section>;
};

export const FilterBar: React.FC<{ children: React.ReactNode; className?: string }> = ({
  children,
  className = ''
}) => (
  <div
    className={`ds-surface p-3.5 flex flex-col md:flex-row items-stretch md:items-center justify-between gap-3 ${className}`}
  >
    {children}
  </div>
);

export const ResponsiveActionGroup: React.FC<{ children: React.ReactNode; className?: string }> = ({
  children,
  className = ''
}) => (
  <div className={`flex items-center gap-2 flex-wrap ${className}`}>{children}</div>
);
