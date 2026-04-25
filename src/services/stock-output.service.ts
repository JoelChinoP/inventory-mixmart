import prisma from "@/lib/prisma";
import type {
  StockOutputInput,
  StockOutputItemInput,
} from "@/services/form-schemas";
import type { StockOutputReason } from "../../prisma/generated/client";

export function isInsufficientStockError(error: unknown) {
  const message = error instanceof Error ? error.message : "";
  return message.includes("Insufficient stock");
}

export async function createStockOutputRecord({
  createdById,
  data,
  items,
}: {
  createdById: string;
  data: StockOutputInput;
  items: StockOutputItemInput[];
}) {
  return prisma.stockOutput.create({
    data: {
      createdById,
      reason: data.reason as StockOutputReason,
      notes: data.notes,
      items: {
        create: items.map((item) => ({
          productId: item.productId,
          quantity: item.quantity,
          unitSalePrice:
            data.reason === "SALE" && typeof item.unitSalePrice === "number"
              ? item.unitSalePrice
              : undefined,
        })),
      },
    },
  });
}
