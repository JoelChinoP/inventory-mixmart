import { Plus } from "lucide-react";
import { Suspense } from "react";

import {
  DateRangeFilter,
  FilterBar,
  SelectFilter,
} from "@/components/filters";
import {
  EmptyState,
  FlashMessage,
  PageHeader,
  Section,
  SectionHeader,
  StatusBadge,
  SubmitButton,
  TableSkeleton,
} from "@/components/shared";
import { FormModal } from "@/components/ui/modal";
import { Select } from "@/components/ui/select";
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
import type {
  ServiceKind,
  ServiceStatus,
} from "../../../../prisma/generated/client";

type ServicesSearchParams = {
  success?: string;
  error?: string;
  from?: string;
  to?: string;
  kind?: ServiceKind;
  status?: ServiceStatus;
  serviceTypeId?: string;
};

type ServicesPageProps = {
  searchParams: Promise<ServicesSearchParams>;
};

function dateTimeLocalValue() {
  return new Date().toISOString().slice(0, 16);
}

export default async function ServicesPage({ searchParams }: ServicesPageProps) {
  const user = await requireActiveUser("/services");
  const params = await searchParams;
  const canManage = canManageCatalog(user.role);

  const [serviceTypes, products] = await Promise.all([
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
  ]);

  const inHouseTypes = serviceTypes.filter((type) => type.kind === "IN_HOUSE");
  const outsourcedTypes = serviceTypes.filter((type) => type.kind === "OUTSOURCED");

  const serviceTypeOptions = serviceTypes.map((type) => ({
    label: `${type.name} - ${serviceKindLabels[type.kind]}`,
    value: type.id,
  }));

  const filterKey = JSON.stringify({
    from: params.from ?? "",
    kind: params.kind ?? "",
    serviceTypeId: params.serviceTypeId ?? "",
    status: params.status ?? "",
    to: params.to ?? "",
  });

  return (
    <div className="space-y-5">
      <PageHeader
        action={
          <div className="flex flex-wrap gap-2">
            <FormModal
              size="lg"
              title="Registrar servicio"
              description="Captura el servicio que se entrega."
              trigger={
                <>
                  <Plus aria-hidden="true" className="h-4 w-4" />
                  Registrar servicio
                </>
              }
            >
              <form action={createServiceRecord} className="grid gap-4 p-6 md:grid-cols-2">
                <label className="space-y-1.5 md:col-span-2">
                  <span className="text-xs font-semibold text-muted-foreground">Tipo</span>
                  <Select name="serviceTypeId" required>
                    <option value="">Seleccionar</option>
                    {serviceTypes.map((type) => (
                      <option key={type.id} value={type.id}>
                        {type.name} - {serviceKindLabels[type.kind]}
                      </option>
                    ))}
                  </Select>
                </label>
                <label className="space-y-1.5">
                  <span className="text-xs font-semibold text-muted-foreground">Estado</span>
                  <Select defaultValue="RECEIVED" name="status">
                    <option value="RECEIVED">Recibido</option>
                    <option value="IN_PROGRESS">En proceso</option>
                    <option value="COMPLETED">Completado</option>
                    <option value="DELIVERED">Entregado</option>
                    <option value="CANCELLED">Cancelado</option>
                  </Select>
                </label>
                <label className="space-y-1.5">
                  <span className="text-xs font-semibold text-muted-foreground">Cantidad</span>
                  <input
                    className="input"
                    defaultValue="1"
                    min="0.001"
                    name="quantity"
                    required
                    step="0.001"
                    type="number"
                  />
                </label>
                <label className="space-y-1.5">
                  <span className="text-xs font-semibold text-muted-foreground">
                    Fecha servicio
                  </span>
                  <input
                    className="input"
                    defaultValue={dateTimeLocalValue()}
                    name="serviceDate"
                    required
                    type="datetime-local"
                  />
                </label>
                <label className="space-y-1.5">
                  <span className="text-xs font-semibold text-muted-foreground">
                    Fecha entrega
                  </span>
                  <input className="input" name="deliveredAt" type="datetime-local" />
                </label>
                <label className="space-y-1.5 md:col-span-2">
                  <span className="text-xs font-semibold text-muted-foreground">
                    Proveedor externo
                  </span>
                  <input className="input" name="externalVendorName" />
                </label>
                <label className="space-y-1.5 md:col-span-2">
                  <span className="text-xs font-semibold text-muted-foreground">Notas</span>
                  <textarea className="input min-h-20 py-2" name="notes" />
                </label>
                <div className="flex justify-end md:col-span-2">
                  <SubmitButton>
                    <Plus aria-hidden="true" className="h-4 w-4" />
                    Registrar servicio
                  </SubmitButton>
                </div>
              </form>
            </FormModal>

            {canManage ? (
              <FormModal
                size="xl"
                title="Nuevo tipo de servicio"
                description="Define un servicio reutilizable con sus insumos."
                triggerClassName="btn-soft"
                trigger={
                  <>
                    <Plus aria-hidden="true" className="h-4 w-4" />
                    Nuevo tipo
                  </>
                }
              >
                <form action={createServiceType} className="space-y-5 p-6">
                  <div className="grid gap-4 md:grid-cols-2">
                    <label className="space-y-1.5 md:col-span-2">
                      <span className="text-xs font-semibold text-muted-foreground">
                        Nombre
                      </span>
                      <input className="input" name="name" required />
                    </label>
                    <label className="space-y-1.5">
                      <span className="text-xs font-semibold text-muted-foreground">
                        Tipo
                      </span>
                      <Select defaultValue="IN_HOUSE" name="kind">
                        <option value="IN_HOUSE">Interno</option>
                        <option value="OUTSOURCED">Tercerizado</option>
                      </Select>
                    </label>
                    <label className="space-y-1.5">
                      <span className="text-xs font-semibold text-muted-foreground">
                        Unidad
                      </span>
                      <input
                        className="input"
                        defaultValue="servicio"
                        name="unitName"
                        required
                      />
                    </label>
                    <label className="space-y-1.5 md:col-span-2">
                      <span className="text-xs font-semibold text-muted-foreground">
                        Descripcion
                      </span>
                      <textarea className="input min-h-16 py-2" name="description" />
                    </label>
                  </div>

                  <div className="overflow-x-auto rounded-card border border-border">
                    <table className="table-operational">
                      <thead className="table-operational-head">
                        <tr>
                          <th className="px-3 py-2">Insumo</th>
                          <th className="px-3 py-2">Cantidad por unidad</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-border">
                        {Array.from({ length: 4 }).map((_, index) => (
                          <tr key={index}>
                            <td className="px-3 py-2">
                              <Select name="supplyProductId">
                                <option value="">Seleccionar</option>
                                {products.map((product) => (
                                  <option key={product.id} value={product.id}>
                                    {product.name} ({product.unitName})
                                  </option>
                                ))}
                              </Select>
                            </td>
                            <td className="px-3 py-2">
                              <input
                                className="input"
                                min="0.001"
                                name="quantityPerUnit"
                                step="0.001"
                                type="number"
                              />
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>

                  <div className="flex justify-end">
                    <SubmitButton>
                      <Plus aria-hidden="true" className="h-4 w-4" />
                      Crear tipo
                    </SubmitButton>
                  </div>
                </form>
              </FormModal>
            ) : null}
          </div>
        }
      />

      {params.success ? (
        <FlashMessage type="success">Servicio guardado correctamente.</FlashMessage>
      ) : null}
      {params.error === "stock" ? (
        <FlashMessage type="error">Stock insuficiente para consumir insumos.</FlashMessage>
      ) : null}

      <div className="grid gap-5 xl:grid-cols-2">
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

      <FilterBar>
        <SelectFilter
          allLabel="Todos"
          label="Tipo"
          name="kind"
          options={[
            { label: "Interno", value: "IN_HOUSE" },
            { label: "Tercerizado", value: "OUTSOURCED" },
          ]}
        />
        <SelectFilter
          allLabel="Todos"
          label="Estado"
          name="status"
          options={[
            { label: "Recibido", value: "RECEIVED" },
            { label: "En proceso", value: "IN_PROGRESS" },
            { label: "Completado", value: "COMPLETED" },
            { label: "Entregado", value: "DELIVERED" },
            { label: "Cancelado", value: "CANCELLED" },
          ]}
        />
        <SelectFilter
          allLabel="Todos"
          label="Servicio"
          className="xl:col-span-2"
          name="serviceTypeId"
          options={serviceTypeOptions}
        />
        <DateRangeFilter
          className="md:col-span-2 xl:col-span-2"
          label="Periodo de servicio"
        />
      </FilterBar>

      <Suspense
        fallback={<TableSkeleton columns={6} rows={6} />}
        key={filterKey}
      >
        <ServicesList searchParams={params} />
      </Suspense>
    </div>
  );
}

async function ServicesList({
  searchParams,
}: {
  searchParams: ServicesSearchParams;
}) {
  const dateFilter: Record<string, Date> = {};
  if (searchParams.from)
    dateFilter.gte = new Date(`${searchParams.from}T00:00:00.000`);
  if (searchParams.to)
    dateFilter.lte = new Date(`${searchParams.to}T23:59:59.999`);

  const records = await prisma.serviceRecord.findMany({
    where: {
      ...(Object.keys(dateFilter).length ? { serviceDate: dateFilter } : {}),
      ...(searchParams.kind ? { kind: searchParams.kind } : {}),
      ...(searchParams.status ? { status: searchParams.status } : {}),
      ...(searchParams.serviceTypeId
        ? { serviceTypeId: searchParams.serviceTypeId }
        : {}),
    },
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
    take: 100,
  });

  return (
    <Section>
      <SectionHeader title="Servicios recientes" />
      {records.length ? (
        <div className="overflow-x-auto">
          <table className="table-operational">
            <thead className="table-operational-head">
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
        <EmptyState title="Sin servicios" description="Sin resultados para los filtros." />
      )}
    </Section>
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
