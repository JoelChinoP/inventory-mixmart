import { z } from "zod";

const nullableText = z
  .string()
  .trim()
  .transform((value) => (value.length ? value : null));

const optionalText = z.string().trim().optional();

const decimalInput = z.coerce.number().finite();
const positiveDecimal = decimalInput.positive();
const nonNegativeDecimal = decimalInput.nonnegative();

export const productSchema = z.object({
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

export const productUpdateSchema = productSchema.extend({
  id: z.string().uuid(),
});

export const supplierSchema = z.object({
  id: optionalText,
  ruc: z.string().trim().min(6),
  name: z.string().trim().min(2),
  phone: z.string().trim().min(5),
  contactName: z.string().trim().min(2),
  address: nullableText,
  notes: nullableText,
});

export const supplierUpdateSchema = supplierSchema.extend({
  id: z.string().uuid(),
});

export const entrySchema = z.object({
  supplierId: z.string().uuid(),
  status: z.enum(["ORDERED", "RECEIVED"]),
  referenceNumber: nullableText,
  notes: nullableText,
});

export const outputSchema = z.object({
  reason: z.enum(["SALE", "WASTE", "INTERNAL_USE"]),
  notes: nullableText,
});

export const serviceTypeSchema = z.object({
  name: z.string().trim().min(2),
  kind: z.enum(["IN_HOUSE", "OUTSOURCED"]),
  unitName: z.string().trim().min(1),
  description: nullableText,
});

export const serviceRecordSchema = z.object({
  serviceTypeId: z.string().uuid(),
  status: z.enum([
    "RECEIVED",
    "IN_PROGRESS",
    "COMPLETED",
    "DELIVERED",
    "CANCELLED",
  ]),
  quantity: positiveDecimal,
  serviceDate: z.string().trim().min(1),
  deliveredAt: nullableText,
  externalVendorName: nullableText,
  notes: nullableText,
});

export const userCreateSchema = z.object({
  username: z.string().trim().min(3),
  email: nullableText,
  firstName: z.string().trim().min(2),
  lastName: z.string().trim().min(2),
  phone: nullableText,
  dni: nullableText,
  role: z.enum(["ADMIN", "WORKER"]),
  password: z.string().min(8),
});

export const userUpdateSchema = z.object({
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

const stockEntryItemSchema = z.object({
  productId: z.string().uuid(),
  quantity: positiveDecimal,
  unitCost: nonNegativeDecimal,
});

const stockOutputItemSchema = z.object({
  productId: z.string().uuid(),
  quantity: positiveDecimal,
  unitSalePrice: z
    .union([z.literal(""), z.coerce.number().finite().nonnegative()])
    .optional(),
});

const serviceTypeSupplySchema = z.object({
  productId: z.string().uuid(),
  quantityPerUnit: positiveDecimal,
});

export type ProductInput = z.infer<typeof productSchema>;
export type ProductUpdateInput = z.infer<typeof productUpdateSchema>;
export type SupplierInput = z.infer<typeof supplierSchema>;
export type SupplierUpdateInput = z.infer<typeof supplierUpdateSchema>;
export type StockEntryInput = z.infer<typeof entrySchema>;
export type StockEntryItemInput = z.infer<typeof stockEntryItemSchema>;
export type StockOutputInput = z.infer<typeof outputSchema>;
export type StockOutputItemInput = z.infer<typeof stockOutputItemSchema>;
export type ServiceTypeInput = z.infer<typeof serviceTypeSchema>;
export type ServiceTypeSupplyInput = z.infer<typeof serviceTypeSupplySchema>;
export type ServiceRecordInput = z.infer<typeof serviceRecordSchema>;
export type UserCreateInput = z.infer<typeof userCreateSchema>;
export type UserUpdateInput = z.infer<typeof userUpdateSchema>;

export function stringValue(formData: FormData, key: string) {
  return String(formData.get(key) ?? "");
}

export function parseForm<T extends z.ZodTypeAny>(
  schema: T,
  formData: FormData,
): z.infer<T> {
  return schema.parse(Object.fromEntries(formData));
}

export function idFromForm(formData: FormData) {
  return z.string().uuid().parse(stringValue(formData, "id"));
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

export function parseStockEntryItems(formData: FormData) {
  return z.array(stockEntryItemSchema).min(1).parse(lineItems(formData));
}

export function parseStockOutputItems(formData: FormData) {
  return z.array(stockOutputItemSchema).min(1).parse(lineItems(formData));
}

export function parseServiceTypeSupplies(formData: FormData) {
  return z.array(serviceTypeSupplySchema).parse(supplyItems(formData));
}
