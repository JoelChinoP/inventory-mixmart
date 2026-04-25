import { Plus } from "lucide-react";

import {
  EmptyState,
  FlashMessage,
  PageHeader,
  Section,
  SectionHeader,
  StatusBadge,
  SubmitButton,
} from "@/components/shared";
import {
  decimalToNumber,
  formatCurrency,
  formatDate,
  formatDecimal,
  serviceKindLabels,
  serviceStatusLabels,
} from "@/lib/format";
import { requireActiveUser } from "@/lib/auth";
import { canManageCatalog } from "@/lib/permissions";
import prisma from "@/lib/prisma";
import {
  createServiceRecord,
  createServiceType,
  deactivateServiceType,
  reactivateServiceType,
} from "@/server/actions";
import type { ServiceKind } from "../../../../prisma/generated/client";

type ServicesPageProps = {
  searchParams: Promise<{
    success?: string;
    error?: string;
  }>;
};

function dateTimeLocalValue() {
  return new Date().toISOString().slice(0, 16);
}

export default async function ServicesPage({ searchParams }: ServicesPageProps) {
  const user = await requireActiveUser("/services");
  const params = await searchParams;
  const canManage = canManageCatalog(user.role);

  const [serviceTypes, products, records] = await Promise.all([
    prisma.serviceType.findMany({
      where: { isActive: true },
      include: {
        supplies: {
          include: {
            product: { select: { name: true, unitName: true } },
          },
        },
      },
      orderBy: [{ kind: "asc" }, { name: "asc" }],
      take: 100,
    }),
    prisma.product.findMany({
      where: { isActive: true },
      select: { id: true, name: true, unitName: true, currentStock: true },
      orderBy: { name: "asc" },
      take: 300,
    }),
    prisma.serviceRecord.findMany({
      include: {
        serviceType: { select: { name: true } },
        createdBy: { select: { firstName: true, lastName: true } },
        consumptions: {
          include: {
            product: { select: { name: true, unitName: true, purchasePrice: true } },
          },
        },
      },
      orderBy: { serviceDate: "desc" },
      take: 50,
    }),
  ]);

  const inHouseTypes = serviceTypes.filter((type) => type.kind === "IN_HOUSE");
  const outsourcedTypes = serviceTypes.filter((type) => type.kind === "OUTSOURCED");

  return (
    <div>
      <PageHeader
        title="Servicios"
        description="Servicios internos con consumo de insumos y trabajos tercerizados."
      />

      {params.success ? (
        <FlashMessage type="success">Servicio guardado correctamente.</FlashMessage>
      ) : null}
      {params.error === "stock" ? (
        <FlashMessage type="error">Stock insuficiente para consumir insumos.</FlashMessage>
      ) : null}

      <div className="grid gap-5 xl:grid-cols-[1fr_0.9fr]">
        <Section>
          <SectionHeader title="Registrar servicio" />
          <form action={createServiceRecord} className="grid gap-3 p-4 md:grid-cols-2">
            <label className="space-y-1 md:col-span-2">
              <span className="text-xs font-medium text-muted-foreground">Tipo</span>
              <select className="input" name="serviceTypeId" required>
                <option value="">Seleccionar</option>
                {serviceTypes.map((type) => (
                  <option key={type.id} value={type.id}>
                    {type.name} - {serviceKindLabels[type.kind]}
                  </option>
                ))}
              </select>
            </label>
            <label className="space-y-1">
              <span className="text-xs font-medium text-muted-foreground">Estado</span>
              <select className="input" name="status" defaultValue="RECEIVED">
                <option value="RECEIVED">Recibido</option>
                <option value="IN_PROGRESS">En proceso</option>
                <option value="COMPLETED">Completado</option>
                <option value="DELIVERED">Entregado</option>
                <option value="CANCELLED">Cancelado</option>
              </select>
            </label>
            <label className="space-y-1">
              <span className="text-xs font-medium text-muted-foreground">Cantidad</span>
              <input className="input" defaultValue="1" min="0.001" name="quantity" required step="0.001" type="number" />
            </label>
            <label className="space-y-1">
              <span className="text-xs font-medium text-muted-foreground">Fecha servicio</span>
              <input className="input" defaultValue={dateTimeLocalValue()} name="serviceDate" required type="datetime-local" />
            </label>
            <label className="space-y-1">
              <span className="text-xs font-medium text-muted-foreground">Fecha entrega</span>
              <input className="input" name="deliveredAt" type="datetime-local" />
            </label>
            <label className="space-y-1 md:col-span-2">
              <span className="text-xs font-medium text-muted-foreground">Proveedor externo</span>
              <input className="input" name="externalVendorName" />
            </label>
            <label className="space-y-1 md:col-span-2">
              <span className="text-xs font-medium text-muted-foreground">Notas</span>
              <textarea className="input min-h-20 py-2" name="notes" />
            </label>
            <div className="md:col-span-2">
              <SubmitButton>
                <Plus aria-hidden="true" className="h-4 w-4" />
                Registrar servicio
              </SubmitButton>
            </div>
          </form>
        </Section>

        {canManage ? (
          <Section>
            <SectionHeader title="Nuevo tipo de servicio" />
            <form action={createServiceType} className="space-y-4 p-4">
              <div className="grid gap-3 md:grid-cols-2">
                <label className="space-y-1 md:col-span-2">
                  <span className="text-xs font-medium text-muted-foreground">Nombre</span>
                  <input className="input" name="name" required />
                </label>
                <label className="space-y-1">
                  <span className="text-xs font-medium text-muted-foreground">Tipo</span>
                  <select className="input" name="kind" defaultValue="IN_HOUSE">
                    <option value="IN_HOUSE">Interno</option>
                    <option value="OUTSOURCED">Tercerizado</option>
                  </select>
                </label>
                <label className="space-y-1">
                  <span className="text-xs font-medium text-muted-foreground">Unidad</span>
                  <input className="input" defaultValue="servicio" name="unitName" required />
                </label>
                <label className="space-y-1 md:col-span-2">
                  <span className="text-xs font-medium text-muted-foreground">Descripcion</span>
                  <textarea className="input min-h-16 py-2" name="description" />
                </label>
              </div>

              <div className="overflow-x-auto rounded-card border border-border">
                <table className="min-w-full text-sm">
                  <thead className="bg-surface-muted text-left text-xs uppercase text-muted-foreground">
                    <tr>
                      <th className="px-3 py-2">Insumo</th>
                      <th className="px-3 py-2">Cantidad por unidad</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-border">
                    {Array.from({ length: 4 }).map((_, index) => (
                      <tr key={index}>
                        <td className="px-3 py-2">
                          <select className="input" name="supplyProductId">
                            <option value="">Seleccionar</option>
                            {products.map((product) => (
                              <option key={product.id} value={product.id}>
                                {product.name} ({product.unitName})
                              </option>
                            ))}
                          </select>
                        </td>
                        <td className="px-3 py-2">
                          <input className="input" min="0.001" name="quantityPerUnit" step="0.001" type="number" />
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>

              <SubmitButton>
                <Plus aria-hidden="true" className="h-4 w-4" />
                Crear tipo
              </SubmitButton>
            </form>
          </Section>
        ) : null}
      </div>

      <div className="mt-5 grid gap-5 xl:grid-cols-2">
        <ServiceTypeList
          canManage={canManage}
          title="Servicios internos"
          types={inHouseTypes}
        />
        <ServiceTypeList
          canManage={canManage}
          title="Servicios tercerizados"
          types={outsourcedTypes}
        />
      </div>

      <Section className="mt-5">
        <SectionHeader title="Servicios recientes" />
        {records.length ? (
          <div className="overflow-x-auto">
            <table className="min-w-full text-sm">
              <thead className="bg-surface-muted text-left text-xs uppercase text-muted-foreground">
                <tr>
                  <th className="px-4 py-3">Servicio</th>
                  <th className="px-4 py-3">Tipo</th>
                  <th className="px-4 py-3">Estado</th>
                  <th className="px-4 py-3">Cantidad</th>
                  <th className="px-4 py-3">Fecha</th>
                  <th className="px-4 py-3">Consumo</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border">
                {records.map((record) => {
                  const consumptionCost = record.consumptions.reduce(
                    (sum, item) =>
                      sum +
                      decimalToNumber(item.quantity) *
                        decimalToNumber(item.product.purchasePrice),
                    0,
                  );

                  return (
                    <tr key={record.id}>
                      <td className="px-4 py-3 font-medium text-foreground">
                        {record.serviceType.name}
                      </td>
                      <td className="px-4 py-3">{serviceKindLabels[record.kind]}</td>
                      <td className="px-4 py-3">
                        <StatusBadge
                          tone={record.status === "CANCELLED" ? "error" : "info"}
                        >
                          {serviceStatusLabels[record.status]}
                        </StatusBadge>
                      </td>
                      <td className="px-4 py-3">{formatDecimal(record.quantity, 3)}</td>
                      <td className="px-4 py-3">{formatDate(record.serviceDate)}</td>
                      <td className="px-4 py-3">
                        {record.consumptions.length ? (
                          <details>
                            <summary className="cursor-pointer text-primary">
                              {formatCurrency(consumptionCost)}
                            </summary>
                            <ul className="mt-2 space-y-1">
                              {record.consumptions.map((item) => (
                                <li key={item.id}>
                                  {item.product.name}: {formatDecimal(item.quantity, 3)}{" "}
                                  {item.product.unitName}
                                </li>
                              ))}
                            </ul>
                          </details>
                        ) : (
                          "-"
                        )}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        ) : (
          <EmptyState title="Sin servicios" description="Registra el primer servicio." />
        )}
      </Section>
    </div>
  );
}

function ServiceTypeList({
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
            <div className="px-4 py-3" key={type.id}>
              <div className="flex items-start justify-between gap-3">
                <div>
                  <p className="font-medium text-foreground">{type.name}</p>
                  <p className="text-sm text-muted-foreground">
                    {type.description || type.unitName}
                  </p>
                </div>
                <StatusBadge tone={type.isActive ? "success" : "warning"}>
                  {type.isActive ? "Activo" : "Inactivo"}
                </StatusBadge>
              </div>
              {type.supplies.length ? (
                <ul className="mt-3 grid gap-2 text-sm md:grid-cols-2">
                  {type.supplies.map((supply) => (
                    <li
                      className="rounded-control border border-border bg-surface-muted px-3 py-2"
                      key={supply.id}
                    >
                      {supply.product.name}: {formatDecimal(supply.quantityPerUnit, 3)}{" "}
                      {supply.product.unitName}
                    </li>
                  ))}
                </ul>
              ) : null}
              {canManage ? (
                <form
                  action={type.isActive ? deactivateServiceType : reactivateServiceType}
                  className="mt-3"
                >
                  <input name="id" type="hidden" value={type.id} />
                  <SubmitButton className="btn btn-ghost border border-border">
                    {type.isActive ? "Desactivar" : "Activar"}
                  </SubmitButton>
                </form>
              ) : null}
            </div>
          ))}
        </div>
      ) : (
        <EmptyState title="Sin tipos" />
      )}
    </Section>
  );
}

type ServiceTypeRow = {
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
