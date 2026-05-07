const ACTION_ICON_BUTTON_BASE =
  "inline-flex size-8 min-h-0 shrink-0 items-center justify-center rounded-control border border-border bg-surface p-0 text-muted-foreground transition focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:ring-offset-background disabled:pointer-events-none disabled:opacity-50 [&>svg]:size-3.5 [&>svg]:shrink-0";

export const iconBtnEdit = `${ACTION_ICON_BUTTON_BASE} hover:border-primary-300 hover:bg-primary-50 hover:text-primary`;
export const iconBtnWarn = `${ACTION_ICON_BUTTON_BASE} hover:border-warning/40 hover:bg-warning-surface hover:text-warning`;
export const iconBtnGood = `${ACTION_ICON_BUTTON_BASE} hover:border-success/40 hover:bg-success-surface hover:text-success`;
export const iconBtnDanger = `${ACTION_ICON_BUTTON_BASE} hover:border-error/40 hover:bg-error-surface hover:text-error`;
