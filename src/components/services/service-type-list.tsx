import { Power, PowerOff } from "lucide-react";

import {
  ActionTip,
  EmptyState,
  IdActionForm,
  Section,
  SectionHeader,
  StatusBadge,
  iconBtnGood,
  iconBtnWarn,
} from "@/components/shared";
import { formatDecimal } from "@/lib/format";
import { deactivateServiceType, reactivateServiceType } from "@/server/actions";
import type { ServiceKind } from "../../../prisma/generated/client";

export type ServiceTypeRow = {
  id: string;
  name: string;
  kind: ServiceKind;
  unitName: string;
  description: string | null;
  isActive: boolean;
  supplies: {
    id: string;
    quantityPerUnit: { toNumber: () => number } | number | string;
    product: {
      name: string;
      unitName: string;
    };
  }[];
};

export function ServiceTypeList({
  title,
  types,
  canManage,
}: {
  title: string;
  canManage: boolean;
  types: ServiceTypeRow[];
}) {
  return (
    <Section>
      <SectionHeader title={title} />
      {types.length ? (
        <div className="divide-y divide-border">
          {types.map((type) => (
            <div
              className="flex items-center gap-3 px-4 py-2.5"
              key={type.id}
            >
              <div className="min-w-0 flex-1">
                <div className="flex flex-wrap items-center gap-x-2 gap-y-1">
                  <span className="text-sm font-medium text-foreground">
                    {type.name}
                  </span>
                  <span className="text-xs text-muted-foreground">
                    / {type.unitName}
                  </span>
                  {type.supplies.length > 0 && (
                    <span className="rounded-full border border-border bg-surface-muted px-1.5 py-0.5 text-[10px] text-muted-foreground">
                      {type.supplies.length} insumo{type.supplies.length !== 1 ? "s" : ""}:{" "}
                      {type.supplies
                        .map(
                          (s) =>
                            `${s.product.name} ×${formatDecimal(s.quantityPerUnit, 2)}`,
                        )
                        .join(", ")}
                    </span>
                  )}
                </div>
              </div>

              <div className="flex shrink-0 items-center gap-2">
                <StatusBadge tone={type.isActive ? "success" : "warning"}>
                  {type.isActive ? "Activo" : "Inactivo"}
                </StatusBadge>
                {canManage ? (
                  <ActionTip label={type.isActive ? "Desactivar" : "Activar"}>
                    <IdActionForm
                      action={
                        type.isActive ? deactivateServiceType : reactivateServiceType
                      }
                      className={type.isActive ? iconBtnWarn : iconBtnGood}
                      id={type.id}
                      label={type.isActive ? "Desactivar" : "Activar"}
                    >
                      {type.isActive ? (
                        <PowerOff aria-hidden="true" data-icon="icon" />
                      ) : (
                        <Power aria-hidden="true" data-icon="icon" />
                      )}
                    </IdActionForm>
                  </ActionTip>
                ) : null}
              </div>
            </div>
          ))}
        </div>
      ) : (
        <EmptyState title="Sin tipos" />
      )}
    </Section>
  );
}
