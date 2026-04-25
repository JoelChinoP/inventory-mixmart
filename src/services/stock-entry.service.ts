import prisma from "@/lib/prisma";
import type {
  StockEntryInput,
  StockEntryItemInput,
} from "@/services/form-schemas";
import type { StockEntryStatus } from "../../prisma/generated/client";

export async function createStockEntryRecord({
  createdById,
  data,
  items,
}: {
  createdById: string;
  data: StockEntryInput;
  items: StockEntryItemInput[];
}) {
  return prisma.stockEntry.create({
    data: {
      supplierId: data.supplierId,
      createdById,
      status: data.status as StockEntryStatus,
      receivedAt: data.status === "RECEIVED" ? new Date() : null,
      referenceNumber: data.referenceNumber,
      notes: data.notes,
      items: {
        create: items.map((item) => ({
          productId: item.productId,
          quantity: item.quantity,
          unitCost: item.unitCost,
        })),
      },
    },
  });
}

export async function receiveStockEntryRecord(id: string) {
  return prisma.stockEntry.update({
    where: { id },
    data: {
      status: "RECEIVED",
      receivedAt: new Date(),
    },
  });
}
