import prisma from "@/lib/prisma";
import type {
  ServiceRecordInput,
  ServiceTypeInput,
  ServiceTypeSupplyInput,
} from "@/services/form-schemas";
import type { ServiceKind, ServiceStatus } from "../../prisma/generated/client";

export async function createServiceTypeRecord({
  data,
  supplies,
}: {
  data: ServiceTypeInput;
  supplies: ServiceTypeSupplyInput[];
}) {
  return prisma.serviceType.create({
    data: {
      name: data.name,
      kind: data.kind as ServiceKind,
      unitName: data.unitName,
      description: data.description,
      supplies:
        data.kind === "IN_HOUSE" && supplies.length
          ? {
              create: supplies.map((item) => ({
                productId: item.productId,
                quantityPerUnit: item.quantityPerUnit,
              })),
            }
          : undefined,
    },
  });
}

export async function setServiceTypeActive(id: string, isActive: boolean) {
  return prisma.serviceType.update({
    where: { id },
    data: { isActive },
  });
}

export async function createServiceRecord({
  createdById,
  data,
}: {
  createdById: string;
  data: ServiceRecordInput;
}) {
  const serviceType = await prisma.serviceType.findUniqueOrThrow({
    where: { id: data.serviceTypeId },
    select: { kind: true },
  });

  return prisma.serviceRecord.create({
    data: {
      serviceTypeId: data.serviceTypeId,
      createdById,
      kind: serviceType.kind,
      status: data.status as ServiceStatus,
      quantity: data.quantity,
      serviceDate: new Date(data.serviceDate),
      deliveredAt:
        data.status === "DELIVERED" && data.deliveredAt
          ? new Date(data.deliveredAt)
          : null,
      externalVendorName: data.externalVendorName,
      notes: data.notes,
    },
  });
}
