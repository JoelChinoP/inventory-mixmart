import prisma from "@/lib/prisma";
import type {
  ProductInput,
  ProductUpdateInput,
  StockAdjustmentInput,
  SupplierInput,
  SupplierUpdateInput,
} from "@/services/form-schemas";
import type { ProductCategory } from "../../prisma/generated/client";

type RestorableModel = "product" | "supplier" | "serviceType" | "serviceTypeSupply";

const CATEGORY_CODE: Record<string, string> = {
  SCHOOL_SUPPLIES: "ESC",
  BAZAAR: "BAZ",
  SNACKS: "SNK",
};

async function generateProductCode(brandCode: string, category: string): Promise<string> {
  const catCode = CATEGORY_CODE[category] ?? "GEN";
  for (let i = 0; i < 10; i++) {
    const suffix = Math.random().toString(36).slice(2, 7).toUpperCase();
    const code = `${brandCode}-${catCode}-${suffix}`;
    const exists = await prisma.product.findUnique({ where: { sku: code } });
    if (!exists) return code;
  }
  return `${brandCode}-${catCode}-${Date.now().toString(36).toUpperCase().slice(-5)}`;
}

async function restoreModel(model: RestorableModel, id: string) {
  const delegate = prisma[model] as unknown as {
    restore(where: { id: string }): Promise<unknown>;
  };

  await delegate.restore({ id });
}

type BrandRow = { id: string; name: string; code: string };

export async function getBrands(): Promise<BrandRow[]> {
  try {
    const rows = await prisma.$queryRaw<BrandRow[]>`
      SELECT id::text, name, code
      FROM brands
      WHERE is_active = true AND deleted_at IS NULL
      ORDER BY name ASC
    `;
    return rows;
  } catch {
    return [];
  }
}

async function getBrandById(id: string): Promise<BrandRow | null> {
  try {
    const rows = await prisma.$queryRaw<BrandRow[]>`
      SELECT id::text, name, code FROM brands WHERE id = ${id}::uuid LIMIT 1
    `;
    return rows[0] ?? null;
  } catch {
    return null;
  }
}

export async function createProductRecord(data: ProductInput) {
  let sku = data.sku;

  if (!sku && data.brandId) {
    const brand = await getBrandById(data.brandId);
    if (brand) {
      sku = await generateProductCode(brand.code, data.category);
    }
  } else if (!sku) {
    sku = await generateProductCode("GEN", data.category);
  }

  return prisma.product.create({
    data: {
      sku,
      brandId: data.brandId,
      name: data.name,
      description: data.description,
      category: data.category as ProductCategory,
      unitName: data.unitName,
      purchasePrice: data.purchasePrice,
      salePrice: data.salePrice,
      minimumStock: data.minimumStock,
      currentStock: data.initialStock,
    },
  });
}

export async function updateProductRecord(data: ProductUpdateInput) {
  return prisma.product.update({
    where: { id: data.id },
    data: {
      sku: data.sku,
      brandId: data.brandId,
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

export async function adjustProductStock({
  performedById,
  data,
}: {
  performedById: string;
  data: StockAdjustmentInput;
}) {
  const product = await prisma.product.findUniqueOrThrow({
    where: { id: data.productId },
    select: { currentStock: true },
  });

  const currentStock = Number(product.currentStock);
  const newStock = data.newStock;
  const delta = Math.abs(newStock - currentStock);

  if (delta === 0) return;

  const direction = newStock > currentStock ? "IN" : "OUT";

  await prisma.$transaction([
    prisma.product.update({
      where: { id: data.productId },
      data: { currentStock: newStock },
    }),
    prisma.stockMovement.create({
      data: {
        productId: data.productId,
        movementType: "ADJUSTMENT",
        direction,
        quantity: delta,
        productStockAfter: newStock,
        performedById,
        notes: data.notes,
      },
    }),
  ]);
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
