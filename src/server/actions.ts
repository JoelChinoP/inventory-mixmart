"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { z } from "zod";

import { requireActiveUser, requireRole } from "@/lib/auth";
import { hashPassword } from "@/lib/password";
import prisma from "@/lib/prisma";
import type {
  ProductCategory,
  ServiceKind,
  ServiceStatus,
  StockEntryStatus,
  StockOutputReason,
  UserRole,
} from "../../prisma/generated/client";

const adminOnly: UserRole[] = ["ADMIN"];
const operationalRoles: UserRole[] = ["ADMIN", "WORKER"];

const nullableText = z
  .string()
  .trim()
  .transform((value) => (value.length ? value : null));

const optionalText = z.string().trim().optional();

const decimalInput = z.coerce.number().finite();
const positiveDecimal = decimalInput.positive();
const nonNegativeDecimal = decimalInput.nonnegative();

const productSchema = z.object({
  id: optionalText,
  sku: nullableText,
  barcode: nullableText,
  name: z.string().trim().min(2),
  description: nullableText,
  category: z.enum(["SCHOOL_SUPPLIES", "BAZAAR", "SNACKS"]),
  unitName: z.string().trim().min(1),
  purchasePrice: nonNegativeDecimal,
  salePrice: z
    .union([z.literal(""), z.coerce.number().finite().nonnegative()])
    .transform((value) => (value === "" ? null : value)),
  minimumStock: nonNegativeDecimal,
});

const supplierSchema = z.object({
  id: optionalText,
  ruc: z.string().trim().min(6),
  name: z.string().trim().min(2),
  phone: z.string().trim().min(5),
  contactName: z.string().trim().min(2),
  address: nullableText,
  notes: nullableText,
});

const entrySchema = z.object({
  supplierId: z.string().uuid(),
  status: z.enum(["ORDERED", "RECEIVED"]),
  referenceNumber: nullableText,
  notes: nullableText,
});

const outputSchema = z.object({
  reason: z.enum(["SALE", "WASTE", "INTERNAL_USE"]),
  notes: nullableText,
});

const serviceTypeSchema = z.object({
  name: z.string().trim().min(2),
  kind: z.enum(["IN_HOUSE", "OUTSOURCED"]),
  unitName: z.string().trim().min(1),
  description: nullableText,
});

const serviceRecordSchema = z.object({
  serviceTypeId: z.string().uuid(),
  status: z.enum(["RECEIVED", "IN_PROGRESS", "COMPLETED", "DELIVERED", "CANCELLED"]),
  quantity: positiveDecimal,
  serviceDate: z.string().trim().min(1),
  deliveredAt: nullableText,
  externalVendorName: nullableText,
  notes: nullableText,
});

const userCreateSchema = z.object({
  username: z.string().trim().min(3),
  email: nullableText,
  firstName: z.string().trim().min(2),
  lastName: z.string().trim().min(2),
  phone: nullableText,
  dni: nullableText,
  role: z.enum(["ADMIN", "WORKER"]),
  password: z.string().min(8),
});

const userUpdateSchema = z.object({
  id: z.string().uuid(),
  username: z.string().trim().min(3),
  email: nullableText,
  firstName: z.string().trim().min(2),
  lastName: z.string().trim().min(2),
  phone: nullableText,
  dni: nullableText,
  role: z.enum(["ADMIN", "WORKER"]),
  password: z.string().optional(),
});

function stringValue(formData: FormData, key: string) {
  return String(formData.get(key) ?? "");
}

function parseForm<T extends z.ZodTypeAny>(schema: T, formData: FormData): z.infer<T> {
  return schema.parse(Object.fromEntries(formData));
}

function lineItems(formData: FormData) {
  const productIds = formData.getAll("productId").map(String);
  const quantities = formData.getAll("quantity").map(String);
  const unitCosts = formData.getAll("unitCost").map(String);
  const unitSalePrices = formData.getAll("unitSalePrice").map(String);

  return productIds
    .map((productId, index) => ({
      productId,
      quantity: quantities[index] ?? "",
      unitCost: unitCosts[index] ?? "",
      unitSalePrice: unitSalePrices[index] ?? "",
    }))
    .filter((item) => item.productId && item.quantity);
}

function supplyItems(formData: FormData) {
  const productIds = formData.getAll("supplyProductId").map(String);
  const quantities = formData.getAll("quantityPerUnit").map(String);

  return productIds
    .map((productId, index) => ({
      productId,
      quantityPerUnit: quantities[index] ?? "",
    }))
    .filter((item) => item.productId && item.quantityPerUnit);
}

function idFromForm(formData: FormData) {
  return z.string().uuid().parse(stringValue(formData, "id"));
}

function revalidateCatalog() {
  revalidatePath("/products");
  revalidatePath("/suppliers");
  revalidatePath("/stock");
  revalidatePath("/dashboard");
}

function revalidateOperations() {
  revalidatePath("/dashboard");
  revalidatePath("/stock");
  revalidatePath("/entries");
  revalidatePath("/outputs");
  revalidatePath("/services");
  revalidatePath("/reports");
}

async function restoreModel(
  model: "product" | "supplier" | "serviceType" | "serviceTypeSupply",
  id: string,
) {
  const delegate = prisma[model] as unknown as {
    restore(where: { id: string }): Promise<unknown>;
  };

  await delegate.restore({ id });
}

export async function createProduct(formData: FormData) {
  await requireRole(adminOnly, "/products");
  const data = parseForm(productSchema, formData);

  await prisma.product.create({
    data: {
      sku: data.sku,
      barcode: data.barcode,
      name: data.name,
      description: data.description,
      category: data.category as ProductCategory,
      unitName: data.unitName,
      purchasePrice: data.purchasePrice,
      salePrice: data.salePrice,
      minimumStock: data.minimumStock,
    },
  });

  revalidateCatalog();
  redirect("/products?success=created");
}

export async function updateProduct(formData: FormData) {
  await requireRole(adminOnly, "/products");
  const data = parseForm(productSchema, formData);

  await prisma.product.update({
    where: { id: z.string().uuid().parse(data.id) },
    data: {
      sku: data.sku,
      barcode: data.barcode,
      name: data.name,
      description: data.description,
      category: data.category as ProductCategory,
      unitName: data.unitName,
      purchasePrice: data.purchasePrice,
      salePrice: data.salePrice,
      minimumStock: data.minimumStock,
    },
  });

  revalidateCatalog();
  redirect("/products?success=updated");
}

export async function deactivateProduct(formData: FormData) {
  await requireRole(adminOnly, "/products");
  await prisma.product.update({
    where: { id: idFromForm(formData) },
    data: { isActive: false },
  });
  revalidateCatalog();
}

export async function reactivateProduct(formData: FormData) {
  await requireRole(adminOnly, "/products");
  await prisma.product.update({
    where: { id: idFromForm(formData) },
    data: { isActive: true },
  });
  revalidateCatalog();
}

export async function softDeleteProduct(formData: FormData) {
  await requireRole(adminOnly, "/products");
  await prisma.product.delete({ where: { id: idFromForm(formData) } });
  revalidateCatalog();
}

export async function restoreProduct(formData: FormData) {
  await requireRole(adminOnly, "/products");
  await restoreModel("product", idFromForm(formData));
  revalidateCatalog();
}

export async function createSupplier(formData: FormData) {
  await requireRole(adminOnly, "/suppliers");
  const data = parseForm(supplierSchema, formData);

  await prisma.supplier.create({
    data: {
      ruc: data.ruc,
      name: data.name,
      phone: data.phone,
      contactName: data.contactName,
      address: data.address,
      notes: data.notes,
    },
  });

  revalidateCatalog();
  redirect("/suppliers?success=created");
}

export async function updateSupplier(formData: FormData) {
  await requireRole(adminOnly, "/suppliers");
  const data = parseForm(supplierSchema, formData);

  await prisma.supplier.update({
    where: { id: z.string().uuid().parse(data.id) },
    data: {
      ruc: data.ruc,
      name: data.name,
      phone: data.phone,
      contactName: data.contactName,
      address: data.address,
      notes: data.notes,
    },
  });

  revalidateCatalog();
  redirect("/suppliers?success=updated");
}

export async function deactivateSupplier(formData: FormData) {
  await requireRole(adminOnly, "/suppliers");
  await prisma.supplier.update({
    where: { id: idFromForm(formData) },
    data: { isActive: false },
  });
  revalidateCatalog();
}

export async function reactivateSupplier(formData: FormData) {
  await requireRole(adminOnly, "/suppliers");
  await prisma.supplier.update({
    where: { id: idFromForm(formData) },
    data: { isActive: true },
  });
  revalidateCatalog();
}

export async function softDeleteSupplier(formData: FormData) {
  await requireRole(adminOnly, "/suppliers");
  await prisma.supplier.delete({ where: { id: idFromForm(formData) } });
  revalidateCatalog();
}

export async function restoreSupplier(formData: FormData) {
  await requireRole(adminOnly, "/suppliers");
  await restoreModel("supplier", idFromForm(formData));
  revalidateCatalog();
}

export async function createStockEntry(formData: FormData) {
  const user = await requireRole(operationalRoles, "/entries");
  const data = parseForm(entrySchema, formData);
  const items = z
    .array(
      z.object({
        productId: z.string().uuid(),
        quantity: positiveDecimal,
        unitCost: nonNegativeDecimal,
      }),
    )
    .min(1)
    .parse(lineItems(formData));

  await prisma.stockEntry.create({
    data: {
      supplierId: data.supplierId,
      createdById: user.id,
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

  revalidateOperations();
  redirect("/entries?success=created");
}

export async function receiveStockEntry(formData: FormData) {
  await requireRole(operationalRoles, "/entries");

  await prisma.stockEntry.update({
    where: { id: idFromForm(formData) },
    data: {
      status: "RECEIVED",
      receivedAt: new Date(),
    },
  });

  revalidateOperations();
}

export async function createStockOutput(formData: FormData) {
  const user = await requireRole(operationalRoles, "/outputs");
  const data = parseForm(outputSchema, formData);
  const items = z
    .array(
      z.object({
        productId: z.string().uuid(),
        quantity: positiveDecimal,
        unitSalePrice: z
          .union([z.literal(""), z.coerce.number().finite().nonnegative()])
          .optional(),
      }),
    )
    .min(1)
    .parse(lineItems(formData));

  try {
    await prisma.stockOutput.create({
      data: {
        createdById: user.id,
        reason: data.reason as StockOutputReason,
        notes: data.notes,
        items: {
          create: items.map((item) => ({
            productId: item.productId,
            quantity: item.quantity,
            unitSalePrice:
              data.reason === "SALE" && item.unitSalePrice !== ""
                ? item.unitSalePrice
                : undefined,
          })),
        },
      },
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : "";
    if (message.includes("Insufficient stock")) {
      redirect("/outputs?error=stock");
    }
    throw error;
  }

  revalidateOperations();
  redirect("/outputs?success=created");
}

export async function createServiceType(formData: FormData) {
  await requireRole(adminOnly, "/services");
  const data = parseForm(serviceTypeSchema, formData);
  const supplies = z
    .array(
      z.object({
        productId: z.string().uuid(),
        quantityPerUnit: positiveDecimal,
      }),
    )
    .parse(supplyItems(formData));

  await prisma.serviceType.create({
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

  revalidatePath("/services");
  redirect("/services?success=type");
}

export async function deactivateServiceType(formData: FormData) {
  await requireRole(adminOnly, "/services");
  await prisma.serviceType.update({
    where: { id: idFromForm(formData) },
    data: { isActive: false },
  });
  revalidatePath("/services");
}

export async function reactivateServiceType(formData: FormData) {
  await requireRole(adminOnly, "/services");
  await prisma.serviceType.update({
    where: { id: idFromForm(formData) },
    data: { isActive: true },
  });
  revalidatePath("/services");
}

export async function restoreServiceType(formData: FormData) {
  await requireRole(adminOnly, "/services");
  await restoreModel("serviceType", idFromForm(formData));
  revalidatePath("/services");
}

export async function createServiceRecord(formData: FormData) {
  const user = await requireRole(operationalRoles, "/services");
  const data = parseForm(serviceRecordSchema, formData);

  const serviceType = await prisma.serviceType.findUniqueOrThrow({
    where: { id: data.serviceTypeId },
    select: { kind: true },
  });

  try {
    await prisma.serviceRecord.create({
      data: {
        serviceTypeId: data.serviceTypeId,
        createdById: user.id,
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
  } catch (error) {
    const message = error instanceof Error ? error.message : "";
    if (message.includes("Insufficient stock")) {
      redirect("/services?error=stock");
    }
    throw error;
  }

  revalidateOperations();
  redirect("/services?success=record");
}

export async function createUser(formData: FormData) {
  await requireRole(adminOnly, "/users");
  const data = parseForm(userCreateSchema, formData);

  await prisma.user.create({
    data: {
      username: data.username,
      email: data.email?.toLowerCase() ?? null,
      firstName: data.firstName,
      lastName: data.lastName,
      phone: data.phone,
      dni: data.dni,
      role: data.role as UserRole,
      passwordHash: await hashPassword(data.password),
      isActive: true,
    },
  });

  revalidatePath("/users");
  redirect("/users?success=created");
}

export async function updateUser(formData: FormData) {
  await requireRole(adminOnly, "/users");
  const data = parseForm(userUpdateSchema, formData);
  const password = data.password?.trim();

  await prisma.user.update({
    where: { id: data.id },
    data: {
      username: data.username,
      email: data.email?.toLowerCase() ?? null,
      firstName: data.firstName,
      lastName: data.lastName,
      phone: data.phone,
      dni: data.dni,
      role: data.role as UserRole,
      ...(password ? { passwordHash: await hashPassword(password) } : {}),
    },
  });

  revalidatePath("/users");
  redirect("/users?success=updated");
}

export async function setUserActive(formData: FormData) {
  const actor = await requireRole(adminOnly, "/users");
  const id = idFromForm(formData);

  if (actor.id === id) {
    redirect("/users?error=self");
  }

  await prisma.user.update({
    where: { id },
    data: {
      isActive: stringValue(formData, "isActive") === "true",
      deletedAt: null,
    },
  });

  revalidatePath("/users");
}

export async function requireCurrentUser() {
  return requireActiveUser();
}
