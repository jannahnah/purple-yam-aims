import type { ReactNode } from "react";

type PageContainerProps = {
  children: ReactNode;
  className?: string;
};

export function PageContainer({ children, className = "" }: PageContainerProps) {
  return (
    <div className={`aims-page aims-container ${className}`.trim()}>
      {children}
    </div>
  );
}

type PageHeaderProps = {
  eyebrow: string;
  title: string;
  description: ReactNode;
  actions?: ReactNode;
  className?: string;
};

export function PageHeader({
  eyebrow,
  title,
  description,
  actions,
  className = "",
}: PageHeaderProps) {
  return (
    <header className={`aims-page-header ${className}`.trim()}>
      <div className="min-w-0">
        <p className="aims-eyebrow">{eyebrow}</p>
        <h1 className="aims-title">{title}</h1>
        <p className="aims-subtitle">{description}</p>
      </div>
      {actions}
    </header>
  );
}

