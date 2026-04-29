import "dotenv/config";

import { PrismaPg } from "@prisma/adapter-pg";

import { PrismaClient } from "./generated/client";
import type {
  ProductCategory,
  ServiceKind,
  ServiceStatus,
  StockEntryStatus,
  StockOutputReason,
  UserRole,
} from "./generated/client";
import { getDatabaseConnection } from "../src/lib/database-url";
import { hashPassword } from "../src/lib/password";

const ADMIN_EMAIL =
  process.env.ADMIN_SEED_EMAIL?.trim().toLowerCase() ||
  "libreriamilton8@gmail.com";
const ADMIN_PASSWORD = process.env.ADMIN_SEED_PASSWORD;
const DEMO_PASSWORD = process.env.DEMO_SEED_PASSWORD || ADMIN_PASSWORD;

const database = getDatabaseConnection();
const adapter = new PrismaPg(
  {
    connectionString: database.connectionString,
  },
  {
    schema: database.schema,
  },
);
const prisma = new PrismaClient({ adapter });

type ProductSeed = {
  sku: string;
  name: string;
  category: ProductCategory;
  unitName: string;
  purchasePrice: number;
  salePrice: number | null;
  minimumStock: number;
  description?: string;
};

type EntryItemSeed = {
  productId: string;
  quantity: number;
  unitCost: number;
};

type OutputItemSeed = {
  productId: string;
  quantity: number;
  unitSalePrice?: number;
};

type SupplySeed = {
  productId: string;
  quantityPerUnit: number;
};

function atDaysAgo(days: number, hour: number, minute = 0) {
  const date = new Date();
  date.setDate(date.getDate() - days);
  date.setHours(hour, minute, 0, 0);
  return date;
}

async function upsertUser({
  username,
  email,
  firstName,
  lastName,
  role,
  passwordHash,
  phone,
  dni,
  isActive = true,
}: {
  username: string;
  email: string | null;
  firstName: string;
  lastName: string;
  role: UserRole;
  passwordHash: string;
  phone?: string;
  dni?: string;
  isActive?: boolean;
}) {
  return prisma.user.upsert({
    where: { username },
    create: {
      username,
      email,
      firstName,
      lastName,
      phone,
      dni,
      passwordHash,
      role,
      isActive,
    },
    update: {
      email,
      firstName,
      lastName,
      phone,
      dni,
      passwordHash,
      role,
      isActive,
      deletedAt: null,
    },
  });
}

async function upsertSupplier({
  ruc,
  name,
  contactName,
  phone,
  address,
  notes,
  isActive = true,
}: {
  ruc: string;
  name: string;
  contactName: string;
  phone: string;
  address: string;
  notes: string;
  isActive?: boolean;
}) {
  return prisma.supplier.upsert({
    where: { ruc },
    create: {
      ruc,
      name,
      contactName,
      phone,
      address,
      notes,
      isActive,
    },
    update: {
      name,
      contactName,
      phone,
      address,
      notes,
      isActive,
      deletedAt: null,
    },
  });
}

async function upsertProduct(data: ProductSeed) {
  return prisma.product.upsert({
    where: { sku: data.sku },
    create: {
      sku: data.sku,
      name: data.name,
      description: data.description,
      category: data.category,
      unitName: data.unitName,
      purchasePrice: data.purchasePrice,
      salePrice: data.salePrice,
      minimumStock: data.minimumStock,
    },
    update: {
      name: data.name,
      description: data.description,
      category: data.category,
      unitName: data.unitName,
      salePrice: data.salePrice,
      minimumStock: data.minimumStock,
      isActive: true,
      deletedAt: null,
    },
  });
}

async function upsertProductSupplier({
  productId,
  supplierId,
  supplierProductCode,
  isPreferred,
}: {
  productId: string;
  supplierId: string;
  supplierProductCode: string;
  isPreferred: boolean;
}) {
  if (isPreferred) {
    await prisma.productSupplier.updateMany({
      where: { productId, deletedAt: null },
      data: { isPreferred: false },
    });
  }

  return prisma.productSupplier.upsert({
    where: {
      productId_supplierId: {
        productId,
        supplierId,
      },
    },
    create: {
      productId,
      supplierId,
      supplierProductCode,
      isPreferred,
    },
    update: {
      supplierProductCode,
      isPreferred,
      deletedAt: null,
    },
  });
}

async function ensureStockEntry({
  supplierId,
  createdById,
  status,
  referenceNumber,
  orderedAt,
  receivedAt,
  notes,
  items,
}: {
  supplierId: string;
  createdById: string;
  status: StockEntryStatus;
  referenceNumber: string;
  orderedAt: Date;
  receivedAt?: Date;
  notes: string;
  items: EntryItemSeed[];
}) {
  const existing = await prisma.stockEntry.findFirst({
    where: { referenceNumber },
  });

  if (existing) {
    return existing;
  }

  return prisma.stockEntry.create({
    data: {
      supplierId,
      createdById,
      status,
      orderedAt,
      receivedAt: status === "RECEIVED" ? receivedAt ?? orderedAt : null,
      referenceNumber,
      notes,
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

async function ensureStockOutput({
  createdById,
  reason,
  occurredAt,
  notes,
  items,
}: {
  createdById: string;
  reason: StockOutputReason;
  occurredAt: Date;
  notes: string;
  items: OutputItemSeed[];
}) {
  const existing = await prisma.stockOutput.findFirst({
    where: { notes },
  });

  if (existing) {
    return existing;
  }

  return prisma.stockOutput.create({
    data: {
      createdById,
      reason,
      occurredAt,
      notes,
      items: {
        create: items.map((item) => ({
          productId: item.productId,
          quantity: item.quantity,
          unitSalePrice: item.unitSalePrice,
        })),
      },
    },
  });
}

async function ensureServiceType({
  name,
  kind,
  unitName,
  description,
  supplies = [],
}: {
  name: string;
  kind: ServiceKind;
  unitName: string;
  description: string;
  supplies?: SupplySeed[];
}) {
  const serviceType = await prisma.serviceType.upsert({
    where: { name },
    create: {
      name,
      kind,
      unitName,
      description,
    },
    update: {
      kind,
      unitName,
      description,
      isActive: true,
      deletedAt: null,
    },
  });

  for (const supply of supplies) {
    await prisma.serviceTypeSupply.upsert({
      where: {
        serviceTypeId_productId: {
          serviceTypeId: serviceType.id,
          productId: supply.productId,
        },
      },
      create: {
        serviceTypeId: serviceType.id,
        productId: supply.productId,
        quantityPerUnit: supply.quantityPerUnit,
      },
      update: {
        quantityPerUnit: supply.quantityPerUnit,
        deletedAt: null,
      },
    });
  }

  return serviceType;
}

async function ensureServiceRecord({
  serviceTypeId,
  createdById,
  kind,
  status,
  quantity,
  serviceDate,
  deliveredAt,
  externalVendorName,
  notes,
}: {
  serviceTypeId: string;
  createdById: string;
  kind: ServiceKind;
  status: ServiceStatus;
  quantity: number;
  serviceDate: Date;
  deliveredAt?: Date;
  externalVendorName?: string;
  notes: string;
}) {
  const existing = await prisma.serviceRecord.findFirst({
    where: { notes },
  });

  if (existing) {
    return existing;
  }

  return prisma.serviceRecord.create({
    data: {
      serviceTypeId,
      createdById,
      kind,
      status,
      quantity,
      serviceDate,
      deliveredAt: status === "DELIVERED" ? deliveredAt ?? serviceDate : null,
      externalVendorName,
      notes,
    },
  });
}

async function main() {
  if (!ADMIN_PASSWORD || !DEMO_PASSWORD) {
    throw new Error(
      "ADMIN_SEED_PASSWORD is required to seed users and demo data.",
    );
  }

  const passwordHash = await hashPassword(ADMIN_PASSWORD);
  const demoPasswordHash =
    DEMO_PASSWORD === ADMIN_PASSWORD ? passwordHash : await hashPassword(DEMO_PASSWORD);

  const admin = await upsertUser({
    username: "admin",
    email: ADMIN_EMAIL,
    firstName: "Administrador",
    lastName: "El Colorado",
    passwordHash,
    role: "ADMIN",
    phone: "959000001",
    dni: "70000001",
  });
  const worker = await upsertUser({
    username: "caja",
    email: "caja@elcolorado.local",
    firstName: "Marisol",
    lastName: "Quispe",
    passwordHash: demoPasswordHash,
    role: "WORKER",
    phone: "959000002",
    dni: "70000002",
  });
  await upsertUser({
    username: "apoyo",
    email: "apoyo@elcolorado.local",
    firstName: "Luis",
    lastName: "Ramos",
    passwordHash: demoPasswordHash,
    role: "WORKER",
    phone: "959000003",
    dni: "70000003",
    isActive: false,
  });

  const supplierSchool = await upsertSupplier({
    ruc: "20481234561",
    name: "Distribuidora Escolar Sur",
    contactName: "Rosa Paredes",
    phone: "054-221100",
    address: "Av. Independencia 125, Arequipa",
    notes: "Proveedor preferido para utiles escolares.",
  });
  const supplierBazaar = await upsertSupplier({
    ruc: "20557890123",
    name: "Bazar Mayorista Santa Catalina",
    contactName: "Hector Salas",
    phone: "054-334455",
    address: "Calle Mercaderes 410, Arequipa",
    notes: "Entrega los martes y viernes.",
  });
  const supplierSnacks = await upsertSupplier({
    ruc: "20661234098",
    name: "Snacks Rapidos del Sur",
    contactName: "Carla Medina",
    phone: "054-445566",
    address: "Parque Industrial Mz. C Lt. 8",
    notes: "Snacks tratados como inventario regular.",
  });
  await upsertSupplier({
    ruc: "20990000111",
    name: "Proveedor Inactivo de Prueba",
    contactName: "Archivo",
    phone: "054-000000",
    address: "Sin direccion activa",
    notes: "Fila para validar filtros de proveedores inactivos.",
    isActive: false,
  });

  const [
    copyPaper,
    notebook,
    glue,
    mica,
    giftWrap,
    balloons,
    chocolate,
    cookies,
    deletedProduct,
  ] = await Promise.all([
    upsertProduct({
      sku: "EC-UTI-PAP-A4",
      name: "Papel bond A4 75 g",
      category: "SCHOOL_SUPPLIES",
      unitName: "paquete",
      purchasePrice: 11.8,
      salePrice: 18,
      minimumStock: 8,
      description: "Paquete para venta y servicios de copiado.",
    }),
    upsertProduct({
      sku: "EC-UTI-CUA-100",
      name: "Cuaderno cuadriculado 100 hojas",
      category: "SCHOOL_SUPPLIES",
      unitName: "unidad",
      purchasePrice: 2.7,
      salePrice: 4.5,
      minimumStock: 10,
      description: "Producto de alta rotacion para campana escolar.",
    }),
    upsertProduct({
      sku: "EC-UTI-GOM-21",
      name: "Goma en barra 21 g",
      category: "SCHOOL_SUPPLIES",
      unitName: "unidad",
      purchasePrice: 1.2,
      salePrice: 2.8,
      minimumStock: 8,
      description: "Insumo y producto de venta.",
    }),
    upsertProduct({
      sku: "EC-UTI-MIC-A4",
      name: "Mica transparente A4",
      category: "SCHOOL_SUPPLIES",
      unitName: "unidad",
      purchasePrice: 0.35,
      salePrice: 0.8,
      minimumStock: 20,
      description: "Insumo para servicios internos.",
    }),
    upsertProduct({
      sku: "EC-BAZ-PAP-REG",
      name: "Papel de regalo surtido",
      category: "BAZAAR",
      unitName: "pliego",
      purchasePrice: 0.9,
      salePrice: 2,
      minimumStock: 6,
      description: "Bazar y consumo para forrado.",
    }),
    upsertProduct({
      sku: "EC-BAZ-GLO-12",
      name: "Globos latex x12",
      category: "BAZAAR",
      unitName: "bolsa",
      purchasePrice: 3.5,
      salePrice: 6,
      minimumStock: 15,
      description: "Producto bajo stock para validar alertas.",
    }),
    upsertProduct({
      sku: "EC-SNA-CHO-25",
      name: "Chocolate personal 25 g",
      category: "SNACKS",
      unitName: "unidad",
      purchasePrice: 0.9,
      salePrice: 1.7,
      minimumStock: 12,
      description: "Snack sin lotes ni vencimiento por politica del negocio.",
    }),
    upsertProduct({
      sku: "EC-SNA-GAL-VAI",
      name: "Galleta vainilla personal",
      category: "SNACKS",
      unitName: "unidad",
      purchasePrice: 0.7,
      salePrice: 1.5,
      minimumStock: 8,
      description: "Producto que queda sin stock tras una merma.",
    }),
    upsertProduct({
      sku: "EC-DEL-ARCHIVO",
      name: "Producto oculto de prueba",
      category: "BAZAAR",
      unitName: "unidad",
      purchasePrice: 1,
      salePrice: 2,
      minimumStock: 1,
      description: "Fila para validar restauracion de catalogo.",
    }),
  ]);

  await prisma.product.update({
    where: { id: deletedProduct.id },
    data: { isActive: false, deletedAt: atDaysAgo(1, 8) },
  });

  await Promise.all([
    upsertProductSupplier({
      productId: copyPaper.id,
      supplierId: supplierSchool.id,
      supplierProductCode: "PAP-A4-75",
      isPreferred: true,
    }),
    upsertProductSupplier({
      productId: notebook.id,
      supplierId: supplierSchool.id,
      supplierProductCode: "CUA-100-C",
      isPreferred: true,
    }),
    upsertProductSupplier({
      productId: notebook.id,
      supplierId: supplierBazaar.id,
      supplierProductCode: "ESC-CUA-100",
      isPreferred: false,
    }),
    upsertProductSupplier({
      productId: giftWrap.id,
      supplierId: supplierBazaar.id,
      supplierProductCode: "REG-SURT",
      isPreferred: true,
    }),
    upsertProductSupplier({
      productId: balloons.id,
      supplierId: supplierBazaar.id,
      supplierProductCode: "GLO-12",
      isPreferred: true,
    }),
    upsertProductSupplier({
      productId: chocolate.id,
      supplierId: supplierSnacks.id,
      supplierProductCode: "CHO-25",
      isPreferred: true,
    }),
    upsertProductSupplier({
      productId: cookies.id,
      supplierId: supplierSnacks.id,
      supplierProductCode: "GAL-VAI",
      isPreferred: true,
    }),
  ]);

  await ensureStockEntry({
    supplierId: supplierSchool.id,
    createdById: admin.id,
    status: "RECEIVED",
    referenceNumber: "EC-SEED-REC-001",
    orderedAt: atDaysAgo(18, 9),
    receivedAt: atDaysAgo(18, 10),
    notes: "SEED: compra recibida inicial para utiles.",
    items: [
      { productId: copyPaper.id, quantity: 40, unitCost: 11.8 },
      { productId: notebook.id, quantity: 60, unitCost: 2.7 },
      { productId: glue.id, quantity: 12, unitCost: 1.2 },
      { productId: mica.id, quantity: 50, unitCost: 0.35 },
    ],
  });
  await ensureStockEntry({
    supplierId: supplierSchool.id,
    createdById: admin.id,
    status: "RECEIVED",
    referenceNumber: "EC-SEED-REC-002",
    orderedAt: atDaysAgo(12, 9),
    receivedAt: atDaysAgo(12, 11),
    notes: "SEED: segunda compra con costo distinto para promedio ponderado.",
    items: [
      { productId: copyPaper.id, quantity: 20, unitCost: 12.4 },
      { productId: notebook.id, quantity: 20, unitCost: 3.1 },
    ],
  });
  await ensureStockEntry({
    supplierId: supplierBazaar.id,
    createdById: worker.id,
    status: "RECEIVED",
    referenceNumber: "EC-SEED-REC-003",
    orderedAt: atDaysAgo(8, 9),
    receivedAt: atDaysAgo(8, 12),
    notes: "SEED: compra recibida de bazar.",
    items: [
      { productId: giftWrap.id, quantity: 18, unitCost: 0.9 },
      { productId: balloons.id, quantity: 10, unitCost: 3.5 },
    ],
  });
  await ensureStockEntry({
    supplierId: supplierSnacks.id,
    createdById: worker.id,
    status: "RECEIVED",
    referenceNumber: "EC-SEED-REC-004",
    orderedAt: atDaysAgo(6, 8),
    receivedAt: atDaysAgo(6, 9),
    notes: "SEED: compra recibida de snacks sin lotes.",
    items: [
      { productId: chocolate.id, quantity: 24, unitCost: 0.9 },
      { productId: cookies.id, quantity: 8, unitCost: 0.7 },
    ],
  });
  await ensureStockEntry({
    supplierId: supplierBazaar.id,
    createdById: worker.id,
    status: "ORDERED",
    referenceNumber: "EC-SEED-ORD-001",
    orderedAt: atDaysAgo(1, 16),
    notes: "SEED: orden pendiente que no debe afectar stock.",
    items: [
      { productId: balloons.id, quantity: 30, unitCost: 3.4 },
      { productId: giftWrap.id, quantity: 12, unitCost: 0.85 },
    ],
  });

  await ensureStockOutput({
    createdById: worker.id,
    reason: "SALE",
    occurredAt: atDaysAgo(4, 10),
    notes: "SEED: salida venta con precio real distinto al sugerido.",
    items: [
      { productId: notebook.id, quantity: 15, unitSalePrice: 4 },
      { productId: glue.id, quantity: 3, unitSalePrice: 2.5 },
      { productId: chocolate.id, quantity: 18, unitSalePrice: 1.6 },
    ],
  });

  await prisma.product.update({
    where: { id: notebook.id },
    data: { salePrice: 4.8 },
  });

  await ensureStockOutput({
    createdById: worker.id,
    reason: "SALE",
    occurredAt: atDaysAgo(2, 17),
    notes: "SEED: salida venta regular con precio sugerido vigente.",
    items: [
      { productId: notebook.id, quantity: 5 },
      { productId: giftWrap.id, quantity: 4 },
      { productId: chocolate.id, quantity: 2 },
    ],
  });
  await ensureStockOutput({
    createdById: worker.id,
    reason: "WASTE",
    occurredAt: atDaysAgo(1, 18),
    notes: "SEED: salida por merma para validar costos sin ingreso.",
    items: [
      { productId: cookies.id, quantity: 8, unitSalePrice: 9 },
      { productId: chocolate.id, quantity: 2, unitSalePrice: 9 },
    ],
  });
  await ensureStockOutput({
    createdById: admin.id,
    reason: "INTERNAL_USE",
    occurredAt: atDaysAgo(0, 11),
    notes: "SEED: salida por uso interno.",
    items: [
      { productId: copyPaper.id, quantity: 1 },
      { productId: glue.id, quantity: 1 },
      { productId: giftWrap.id, quantity: 1 },
    ],
  });

  const copyService = await ensureServiceType({
    name: "Fotocopias blanco y negro",
    kind: "IN_HOUSE",
    unitName: "copia",
    description: "Servicio interno que consume papel bond.",
    supplies: [{ productId: copyPaper.id, quantityPerUnit: 0.02 }],
  });
  const coverService = await ensureServiceType({
    name: "Forrado de cuaderno",
    kind: "IN_HOUSE",
    unitName: "servicio",
    description: "Servicio interno que consume papel de regalo y goma.",
    supplies: [
      { productId: giftWrap.id, quantityPerUnit: 0.2 },
      { productId: glue.id, quantityPerUnit: 0.1 },
    ],
  });
  const outsourcedPrint = await ensureServiceType({
    name: "Impresion formato grande",
    kind: "OUTSOURCED",
    unitName: "trabajo",
    description: "Servicio tercerizado sin consumo automatico de stock.",
  });

  await ensureServiceRecord({
    serviceTypeId: copyService.id,
    createdById: worker.id,
    kind: "IN_HOUSE",
    status: "COMPLETED",
    quantity: 100,
    serviceDate: atDaysAgo(3, 15),
    notes: "SEED: servicio interno completado con consumo automatico.",
  });
  await ensureServiceRecord({
    serviceTypeId: coverService.id,
    createdById: worker.id,
    kind: "IN_HOUSE",
    status: "DELIVERED",
    quantity: 5,
    serviceDate: atDaysAgo(1, 10),
    deliveredAt: atDaysAgo(1, 13),
    notes: "SEED: servicio interno entregado con consumo automatico.",
  });
  await ensureServiceRecord({
    serviceTypeId: copyService.id,
    createdById: worker.id,
    kind: "IN_HOUSE",
    status: "CANCELLED",
    quantity: 20,
    serviceDate: atDaysAgo(1, 15),
    notes: "SEED: servicio interno cancelado sin consumo.",
  });
  await ensureServiceRecord({
    serviceTypeId: outsourcedPrint.id,
    createdById: admin.id,
    kind: "OUTSOURCED",
    status: "RECEIVED",
    quantity: 1,
    serviceDate: atDaysAgo(2, 9),
    externalVendorName: "Grafica Aliada",
    notes: "SEED: servicio tercerizado recibido sin consumo de stock.",
  });
  await ensureServiceRecord({
    serviceTypeId: outsourcedPrint.id,
    createdById: admin.id,
    kind: "OUTSOURCED",
    status: "DELIVERED",
    quantity: 1,
    serviceDate: atDaysAgo(1, 9),
    deliveredAt: atDaysAgo(1, 17),
    externalVendorName: "Grafica Aliada",
    notes: "SEED: servicio tercerizado entregado sin consumo de stock.",
  });

  const [productCount, movementCount, outputCount, serviceCount] =
    await Promise.all([
      prisma.product.count(),
      prisma.stockMovement.count(),
      prisma.stockOutput.count(),
      prisma.serviceRecord.count(),
    ]);

  console.log(`Seeded El Colorado admin user: ${ADMIN_EMAIL}`);
  console.log(
    `Seeded demo data: ${productCount} products, ${movementCount} movements, ${outputCount} outputs, ${serviceCount} services.`,
  );
}

main()
  .catch((error) => {
    console.error(error);
    process.exitCode = 1;
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
