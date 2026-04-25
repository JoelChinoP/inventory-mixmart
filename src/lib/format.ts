import type {
  ProductCategory,
  ServiceKind,
  ServiceStatus,
  StockEntryStatus,
  StockMovementDirection,
  StockMovementType,
  StockOutputReason,
  UserRole,
} from "../../prisma/generated/client";

type DecimalLike = { toNumber: () => number };

export function decimalToNumber(value: DecimalLike | number | string | null | undefined) {
  if (value === null || value === undefined) {
    return 0;
  }

  if (typeof value === "number") {
    return value;
  }

  if (typeof value === "string") {
    return Number(value);
  }

  return value.toNumber();
}

export function formatDecimal(
  value: DecimalLike | number | string | null | undefined,
  digits = 2,
) {
  return new Intl.NumberFormat("es-PE", {
    minimumFractionDigits: 0,
    maximumFractionDigits: digits,
  }).format(decimalToNumber(value));
}

export function formatCurrency(value: DecimalLike | number | string | null | undefined) {
  return new Intl.NumberFormat("es-PE", {
    style: "currency",
    currency: "PEN",
    minimumFractionDigits: 2,
  }).format(decimalToNumber(value));
}

export function formatDate(value: Date | string | null | undefined) {
  if (!value) {
    return "-";
  }

  return new Intl.DateTimeFormat("es-PE", {
    dateStyle: "medium",
    timeStyle: "short",
  }).format(new Date(value));
}

export function formatDateOnly(value: Date | string | null | undefined) {
  if (!value) {
    return "-";
  }

  return new Intl.DateTimeFormat("es-PE", {
    dateStyle: "medium",
  }).format(new Date(value));
}

export const productCategoryLabels: Record<ProductCategory, string> = {
  SCHOOL_SUPPLIES: "Utiles escolares",
  BAZAAR: "Bazar",
  SNACKS: "Snacks",
};

export const stockEntryStatusLabels: Record<StockEntryStatus, string> = {
  ORDERED: "Ordenada",
  RECEIVED: "Recibida",
};

export const stockOutputReasonLabels: Record<StockOutputReason, string> = {
  SALE: "Venta",
  WASTE: "Merma",
  INTERNAL_USE: "Uso interno",
};

export const serviceKindLabels: Record<ServiceKind, string> = {
  IN_HOUSE: "Interno",
  OUTSOURCED: "Tercerizado",
};

export const serviceStatusLabels: Record<ServiceStatus, string> = {
  RECEIVED: "Recibido",
  IN_PROGRESS: "En proceso",
  COMPLETED: "Completado",
  DELIVERED: "Entregado",
  CANCELLED: "Cancelado",
};

export const movementTypeLabels: Record<StockMovementType, string> = {
  PURCHASE_ENTRY: "Compra",
  SALE: "Venta",
  WASTE: "Merma",
  INTERNAL_USE: "Uso interno",
  SERVICE_CONSUMPTION: "Servicio",
};

export const movementDirectionLabels: Record<StockMovementDirection, string> = {
  IN: "Entrada",
  OUT: "Salida",
};

export const roleLabels: Record<UserRole, string> = {
  ADMIN: "Administrador",
  WORKER: "Trabajador",
};
