import { Plus, RotateCcw, Search } from "lucide-react";
import { Fragment } from "react";

import {
  EmptyState,
  FlashMessage,
  PageHeader,
  Section,
  SectionHeader,
  StatusBadge,
  SubmitButton,
} from "@/components/shared";
import { decimalToNumber, formatCurrency, formatDateOnly } from "@/lib/format";
import { requireActiveUser } from "@/lib/auth";
import { canManageCatalog } from "@/lib/permissions";
import prisma from "@/lib/prisma";
import {
  createSupplier,
  deactivateSupplier,
  reactivateSupplier,
  restoreSupplier,
  softDeleteSupplier,
  updateSupplier,
} from "@/server/actions";

type SuppliersPageProps = {
  searchParams: Promise<{
    q?: string;
    status?: "active" | "inactive" | "deleted";
    success?: string;
  }>;
};

export default async function SuppliersPage({ searchParams }: SuppliersPageProps) {
  const user = await requireActiveUser("/suppliers");
  const params = await searchParams;
  const q = params.q?.trim() ?? "";
  const status = params.status ?? "active";
  const canManage = canManageCatalog(user.role);

  const suppliers = await prisma.supplier.findMany({
    where: {
      ...(q
        ? {
            OR: [
              { name: { contains: q, mode: "insensitive" } },
              { ruc: { contains: q, mode: "insensitive" } },
              { contactName: { contains: q, mode: "insensitive" } },
            ],
          }
        : {}),
      ...(status === "inactive"
        ? { isActive: false }
        : status === "deleted"
          ? { deletedAt: { not: null } }
          : { isActive: true }),
    },
    include: {
      _count: {
        select: {
          productSuppliers: true,
          stockEntries: true,
        },
      },
      stockEntries: {
        orderBy: { orderedAt: "desc" },
        take: 3,
        include: {
          items: { select: { quantity: true, unitCost: true } },
        },
      },
    },
    orderBy: [{ isActive: "desc" }, { name: "asc" }],
    take: 100,
  });

  return (
    <div>
      <PageHeader
        title="Proveedores"
        description="Datos de contacto, estado y compras recientes."
      />

      {params.success ? (
        <FlashMessage type="success">Proveedor guardado correctamente.</FlashMessage>
      ) : null}

      <Section className="mb-5">
        <SectionHeader title="Filtros" />
        <form className="grid gap-3 p-4 md:grid-cols-[1fr_180px_auto]" action="/suppliers">
          <label className="space-y-1">
            <span className="text-xs font-medium text-muted-foreground">Buscar</span>
            <input className="input" defaultValue={q} name="q" placeholder="Nombre, RUC o contacto" />
          </label>
          <label className="space-y-1">
            <span className="text-xs font-medium text-muted-foreground">Estado</span>
            <select className="input" defaultValue={status} name="status">
              <option value="active">Activos</option>
              <option value="inactive">Inactivos</option>
              {canManage ? <option value="deleted">Eliminados</option> : null}
            </select>
          </label>
          <div className="flex items-end">
            <button className="btn btn-primary w-full" type="submit">
              <Search aria-hidden="true" className="h-4 w-4" />
              Filtrar
            </button>
          </div>
        </form>
      </Section>

      {canManage ? <SupplierForm /> : null}

      <Section>
        <SectionHeader title="Lista de proveedores" />
        {suppliers.length ? (
          <div className="overflow-x-auto">
            <table className="min-w-full text-sm">
              <thead className="bg-surface-muted text-left text-xs uppercase text-muted-foreground">
                <tr>
                  <th className="px-4 py-3">Proveedor</th>
                  <th className="px-4 py-3">Contacto</th>
                  <th className="px-4 py-3">Productos</th>
                  <th className="px-4 py-3">Compras</th>
                  <th className="px-4 py-3">Estado</th>
                  {canManage ? <th className="px-4 py-3">Acciones</th> : null}
                </tr>
              </thead>
              <tbody className="divide-y divide-border">
                {suppliers.map((supplier) => (
                  <Fragment key={supplier.id}>
                    <tr>
                      <td className="px-4 py-3">
                        <p className="font-medium text-foreground">{supplier.name}</p>
                        <p className="text-xs text-muted-foreground">RUC {supplier.ruc}</p>
                      </td>
                      <td className="px-4 py-3">
                        <p>{supplier.contactName}</p>
                        <p className="text-xs text-muted-foreground">{supplier.phone}</p>
                      </td>
                      <td className="px-4 py-3">{supplier._count.productSuppliers}</td>
                      <td className="px-4 py-3">{supplier._count.stockEntries}</td>
                      <td className="px-4 py-3">
                        {supplier.deletedAt ? (
                          <StatusBadge tone="muted">Eliminado</StatusBadge>
                        ) : supplier.isActive ? (
                          <StatusBadge tone="success">Activo</StatusBadge>
                        ) : (
                          <StatusBadge tone="warning">Inactivo</StatusBadge>
                        )}
                      </td>
                      {canManage ? (
                        <td className="px-4 py-3">
                          <div className="flex flex-wrap gap-2">
                            {supplier.deletedAt ? (
                              <form action={restoreSupplier}>
                                <input name="id" type="hidden" value={supplier.id} />
                                <SubmitButton className="btn btn-secondary">
                                  <RotateCcw aria-hidden="true" className="h-4 w-4" />
                                  Restaurar
                                </SubmitButton>
                              </form>
                            ) : (
                              <>
                                <form
                                  action={
                                    supplier.isActive
                                      ? deactivateSupplier
                                      : reactivateSupplier
                                  }
                                >
                                  <input name="id" type="hidden" value={supplier.id} />
                                  <SubmitButton className="btn btn-ghost border border-border">
                                    {supplier.isActive ? "Desactivar" : "Activar"}
                                  </SubmitButton>
                                </form>
                                <form action={softDeleteSupplier}>
                                  <input name="id" type="hidden" value={supplier.id} />
                                  <SubmitButton className="btn btn-ghost border border-border">
                                    Ocultar
                                  </SubmitButton>
                                </form>
                              </>
                            )}
                          </div>
                        </td>
                      ) : null}
                    </tr>
                    <tr className="bg-surface-muted/45">
                      <td className="px-4 py-3" colSpan={canManage ? 6 : 5}>
                        <details>
                          <summary className="cursor-pointer text-sm font-medium text-primary">
                            Detalle y compras recientes
                          </summary>
                          <div className="mt-3 grid gap-3 md:grid-cols-2">
                            <div className="rounded-control border border-border bg-surface p-3">
                              <p className="text-sm text-muted-foreground">
                                {supplier.address || "Sin direccion registrada"}
                              </p>
                              <p className="mt-2 text-sm text-muted-foreground">
                                {supplier.notes || "Sin notas"}
                              </p>
                            </div>
                            <div className="rounded-control border border-border bg-surface p-3">
                              {supplier.stockEntries.length ? (
                                <ul className="space-y-2">
                                  {supplier.stockEntries.map((entry) => {
                                    const total = entry.items.reduce(
                                      (sum, item) =>
                                        sum +
                                        decimalToNumber(item.quantity) *
                                          decimalToNumber(item.unitCost),
                                      0,
                                    );

                                    return (
                                      <li
                                        className="flex justify-between gap-3 text-sm"
                                        key={entry.id}
                                      >
                                        <span>{formatDateOnly(entry.orderedAt)}</span>
                                        <span className="font-medium">
                                          {formatCurrency(total)}
                                        </span>
                                      </li>
                                    );
                                  })}
                                </ul>
                              ) : (
                                <p className="text-sm text-muted-foreground">
                                  Sin compras recientes.
                                </p>
                              )}
                            </div>
                          </div>
                          {canManage && !supplier.deletedAt ? (
                            <SupplierForm mode="edit" supplier={supplier} />
                          ) : null}
                        </details>
                      </td>
                    </tr>
                  </Fragment>
                ))}
              </tbody>
            </table>
          </div>
        ) : (
          <EmptyState title="Sin proveedores" description="No hay proveedores con esos filtros." />
        )}
      </Section>
    </div>
  );
}

function SupplierForm({
  mode = "create",
  supplier,
}: {
  mode?: "create" | "edit";
  supplier?: {
    id: string;
    ruc: string;
    name: string;
    phone: string;
    contactName: string;
    address: string | null;
    notes: string | null;
  };
}) {
  const isEdit = mode === "edit" && supplier;

  return (
    <Section className={isEdit ? "mt-3 border-border/70 shadow-none" : "mb-5"}>
      <SectionHeader title={isEdit ? "Editar proveedor" : "Nuevo proveedor"} />
      <form
        action={isEdit ? updateSupplier : createSupplier}
        className="grid gap-3 p-4 md:grid-cols-3"
      >
        {isEdit ? <input name="id" type="hidden" value={supplier.id} /> : null}
        <label className="space-y-1">
          <span className="text-xs font-medium text-muted-foreground">RUC</span>
          <input className="input" defaultValue={supplier?.ruc} name="ruc" required />
        </label>
        <label className="space-y-1 md:col-span-2">
          <span className="text-xs font-medium text-muted-foreground">Nombre</span>
          <input className="input" defaultValue={supplier?.name} name="name" required />
        </label>
        <label className="space-y-1">
          <span className="text-xs font-medium text-muted-foreground">Telefono</span>
          <input className="input" defaultValue={supplier?.phone} name="phone" required />
        </label>
        <label className="space-y-1 md:col-span-2">
          <span className="text-xs font-medium text-muted-foreground">Contacto</span>
          <input
            className="input"
            defaultValue={supplier?.contactName}
            name="contactName"
            required
          />
        </label>
        <label className="space-y-1 md:col-span-3">
          <span className="text-xs font-medium text-muted-foreground">Direccion</span>
          <input className="input" defaultValue={supplier?.address ?? ""} name="address" />
        </label>
        <label className="space-y-1 md:col-span-3">
          <span className="text-xs font-medium text-muted-foreground">Notas</span>
          <textarea
            className="input min-h-20 py-2"
            defaultValue={supplier?.notes ?? ""}
            name="notes"
          />
        </label>
        <div className="md:col-span-3">
          <SubmitButton>
            <Plus aria-hidden="true" className="h-4 w-4" />
            {isEdit ? "Guardar cambios" : "Crear proveedor"}
          </SubmitButton>
        </div>
      </form>
    </Section>
  );
}
