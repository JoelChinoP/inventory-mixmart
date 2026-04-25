import prisma from "@/lib/prisma";
import type {
  ProductInput,
  ProductUpdateInput,
  SupplierInput,
  SupplierUpdateInput,
} from "@/services/form-schemas";
import type { ProductCategory } from "../../prisma/generated/client";

type RestorableModel = "product" | "supplier" | "serviceType" | "serviceTypeSupply";

async function restoreModel(model: RestorableModel, id: string) {
  const delegate = prisma[model] as unknown as {
    restore(where: { id: string }): Promise<unknown>;
  };

  await delegate.restore({ id });
}

export async function createProductRecord(data: ProductInput) {
  return prisma.product.create({
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
}

export async function updateProductRecord(data: ProductUpdateInput) {
  return prisma.product.update({
    where: { id: data.id },
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
}

export async function setProductActive(id: string, isActive: boolean) {
  return prisma.product.update({
    where: { id },
    data: { isActive },
  });
}

export async function softDeleteProductRecord(id: string) {
  return prisma.product.delete({ where: { id } });
}

export async function restoreProductRecord(id: string) {
  return restoreModel("product", id);
}

export async function createSupplierRecord(data: SupplierInput) {
  return prisma.supplier.create({
    data: {
      ruc: data.ruc,
      name: data.name,
      phone: data.phone,
      contactName: data.contactName,
      address: data.address,
      notes: data.notes,
    },
  });
}

export async function updateSupplierRecord(data: SupplierUpdateInput) {
  return prisma.supplier.update({
    where: { id: data.id },
    data: {
      ruc: data.ruc,
      name: data.name,
      phone: data.phone,
      contactName: data.contactName,
      address: data.address,
      notes: data.notes,
    },
  });
}

export async function setSupplierActive(id: string, isActive: boolean) {
  return prisma.supplier.update({
    where: { id },
    data: { isActive },
  });
}

export async function softDeleteSupplierRecord(id: string) {
  return prisma.supplier.delete({ where: { id } });
}

export async function restoreSupplierRecord(id: string) {
  return restoreModel("supplier", id);
}

export async function restoreServiceTypeRecord(id: string) {
  return restoreModel("serviceType", id);
}
