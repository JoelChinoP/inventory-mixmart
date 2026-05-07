import { Power, PowerOff, RotateCcw, Trash2 } from "lucide-react";
import type { ReactNode } from "react";

import { StatusBadge } from "./page";
import {
  iconBtnDanger,
  iconBtnEdit,
  iconBtnGood,
  iconBtnWarn,
} from "./record-action-styles";
import { SubmitButton } from "./submit-button";

type ServerAction = (formData: FormData) => Promise<void> | void;
type HiddenField = {
  name: string;
  value: string | number | boolean;
};

export { iconBtnDanger, iconBtnEdit, iconBtnGood, iconBtnWarn };

export function RecordStatusBadge({
  isActive,
  deletedAt,
}: {
  isActive: boolean;
  deletedAt?: Date | null;
}) {
  if (deletedAt) {
    return <StatusBadge tone="muted">Eliminado</StatusBadge>;
  }
  if (isActive) {
    return <StatusBadge tone="success">Activo</StatusBadge>;
  }
  return <StatusBadge tone="warning">Inactivo</StatusBadge>;
}

export function ActionTip({ label, children }: { label: string; children: ReactNode }) {
  return (
    <span className="group relative inline-flex">
      {children}
      <span className="pointer-events-none absolute bottom-full left-1/2 z-50 mb-1.5 -translate-x-1/2 whitespace-nowrap rounded bg-foreground px-1.5 py-0.5 text-[10px] font-medium text-background opacity-0 transition-opacity group-hover:opacity-100 group-focus-within:opacity-100">
        {label}
      </span>
    </span>
  );
}

export function IdActionForm({
  id,
  action,
  className = iconBtnEdit,
  fields = [],
  label,
  pendingLabel,
  children,
}: {
  id: string;
  action: ServerAction;
  className?: string;
  fields?: HiddenField[];
  label?: string;
  pendingLabel?: string;
  children: ReactNode;
}) {
  return (
    <form action={action}>
      <input name="id" type="hidden" value={id} />
      {fields.map((field) => (
        <input
          key={field.name}
          name={field.name}
          type="hidden"
          value={String(field.value)}
        />
      ))}
      <SubmitButton
        aria-label={label}
        className={className}
        pendingLabel={pendingLabel ?? label ?? "Procesando..."}
        showPendingLabel={false}
      >
        {children}
        {label ? <span className="sr-only">{label}</span> : null}
      </SubmitButton>
    </form>
  );
}

export function RecordActions({
  id,
  isActive,
  deletedAt,
  editTrigger,
  onActivate,
  onDeactivate,
  onSoftDelete,
  onRestore,
}: {
  id: string;
  isActive: boolean;
  deletedAt?: Date | null;
  editTrigger?: ReactNode;
  onActivate: ServerAction;
  onDeactivate: ServerAction;
  onSoftDelete: ServerAction;
  onRestore: ServerAction;
}) {
  if (deletedAt) {
    return (
      <div className="flex items-center gap-1">
        <ActionTip label="Restaurar">
          <IdActionForm
            action={onRestore}
            className={iconBtnGood}
            id={id}
            label="Restaurar"
          >
            <RotateCcw aria-hidden="true" data-icon="icon" />
          </IdActionForm>
        </ActionTip>
      </div>
    );
  }

  return (
    <div className="flex items-center gap-1">
      {editTrigger ? <ActionTip label="Editar">{editTrigger}</ActionTip> : null}
      <ActionTip label={isActive ? "Desactivar" : "Activar"}>
        <IdActionForm
          action={isActive ? onDeactivate : onActivate}
          className={isActive ? iconBtnWarn : iconBtnGood}
          id={id}
          label={isActive ? "Desactivar" : "Activar"}
        >
          {isActive ? (
            <PowerOff aria-hidden="true" data-icon="icon" />
          ) : (
            <Power aria-hidden="true" data-icon="icon" />
          )}
        </IdActionForm>
      </ActionTip>
      <ActionTip label="Ocultar">
        <IdActionForm
          action={onSoftDelete}
          className={iconBtnDanger}
          id={id}
          label="Ocultar"
        >
          <Trash2 aria-hidden="true" data-icon="icon" />
        </IdActionForm>
      </ActionTip>
    </div>
  );
}
