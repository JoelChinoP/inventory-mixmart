import type { ReactNode } from "react";
import { Candy, Cookie, ShoppingBag } from "lucide-react";

import { productCategoryLabels } from "@/lib/format";
import { cn } from "@/lib/utils";
import type { ProductCategory } from "../../../prisma/generated/client";

type PageHeaderProps = {
  title: string;
  description?: string;
  action?: ReactNode;
};

export function PageHeader({ title, description, action }: PageHeaderProps) {
  return (
    <header className="mb-5 flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
      <div>
        <h2 className="text-3xl font-semibold tracking-tight text-foreground">
          {title}
        </h2>
        {description ? (
          <p className="mt-1 max-w-3xl text-sm text-muted-foreground">
            {description}
          </p>
        ) : null}
      </div>
      {action ? <div className="flex shrink-0 flex-wrap gap-2">{action}</div> : null}
    </header>
  );
}

type SectionProps = {
  children: ReactNode;
  className?: string;
};

export function Section({ children, className }: SectionProps) {
  return (
    <section
      className={cn(
        "overflow-hidden rounded-card border border-border bg-surface-elevated text-card-foreground shadow-soft",
        className,
      )}
    >
      {children}
    </section>
  );
}

export function SectionHeader({
  title,
  description,
}: {
  title: string;
  description?: string;
}) {
  return (
    <div className="border-b border-border bg-surface px-4 py-3">
      <h3 className="text-base font-semibold text-foreground">{title}</h3>
      {description ? (
        <p className="mt-1 text-sm text-muted-foreground">{description}</p>
      ) : null}
    </div>
  );
}

export function EmptyState({
  title,
  description,
}: {
  title: string;
  description?: string;
}) {
  return (
    <div className="px-4 py-10 text-center">
      <p className="text-sm font-semibold text-foreground">{title}</p>
      {description ? (
        <p className="mt-1 text-sm text-muted-foreground">{description}</p>
      ) : null}
    </div>
  );
}

export function StatusBadge({
  tone,
  children,
}: {
  tone: "success" | "warning" | "error" | "info" | "muted";
  children: ReactNode;
}) {
  const className =
    tone === "muted"
      ? "border-border bg-muted text-muted-foreground"
      : {
          success: "badge-success",
          warning: "badge-warning",
          error: "badge-error",
          info: "badge-info",
        }[tone];

  return <span className={cn("badge", className)}>{children}</span>;
}

const categoryConfig = {
  SCHOOL_SUPPLIES: {
    icon: Candy,
    className: "border-secondary-200 bg-secondary-50 text-secondary-800",
    iconClassName: "bg-secondary-100 text-secondary-700",
  },
  BAZAAR: {
    icon: ShoppingBag,
    className: "border-primary-200 bg-primary-50 text-primary-700",
    iconClassName: "bg-primary-100 text-primary",
  },
  SNACKS: {
    icon: Cookie,
    className: "border-accent-200 bg-accent-50 text-accent-700",
    iconClassName: "bg-accent-100 text-accent-700",
  },
} satisfies Record<
  ProductCategory,
  {
    icon: typeof Candy;
    className: string;
    iconClassName: string;
  }
>;

export function ProductCategoryBadge({
  category,
  className,
}: {
  category: ProductCategory;
  className?: string;
}) {
  const config = categoryConfig[category];
  const Icon = config.icon;

  return (
    <span
      className={cn(
        "inline-flex min-h-8 items-center gap-2 rounded-card border px-2.5 py-1 text-xs font-semibold leading-none",
        config.className,
        className,
      )}
    >
      <span
        className={cn(
          "flex h-5 w-5 shrink-0 items-center justify-center rounded-control",
          config.iconClassName,
        )}
      >
        <Icon aria-hidden="true" className="h-3.5 w-3.5" />
      </span>
      {productCategoryLabels[category]}
    </span>
  );
}

export function FlashMessage({
  type,
  children,
}: {
  type: "success" | "error";
  children: ReactNode;
}) {
  return (
    <p
      className={cn(
        "mb-4 rounded-control border px-3 py-2 text-sm",
        type === "success"
          ? "border-success-border bg-success-surface text-success"
          : "border-error-border bg-error-surface text-error",
      )}
    >
      {children}
    </p>
  );
}
