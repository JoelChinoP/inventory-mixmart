import { Plus } from 'lucide-react';

import { Field } from '@/components/forms';
import { SubmitButton } from '@/components/shared';
import { Select } from '@/components/ui/select';
import { roleLabels } from '@/lib/format';
import { createUser, updateUser } from '@/server/actions';
import type { UserRole } from '../../../prisma/generated/client';

const roles: UserRole[] = ['ADMIN', 'WORKER'];

export type UserFormValues = {
  id: string;
  username: string;
  email: string | null;
  firstName: string;
  lastName: string;
  phone: string | null;
  dni: string | null;
  role: UserRole;
};

export function UserForm({ user }: { user?: UserFormValues }) {
  const isEdit = Boolean(user);

  return (
    <form action={isEdit ? updateUser : createUser} className="space-y-3 p-5">
      {isEdit && user ? (
        <input name="id" type="hidden" value={user.id} />
      ) : null}

      <fieldset className="space-y-3">
        <legend className="text-[11px] font-semibold uppercase tracking-[0.12em] text-muted-foreground">
          Cuenta
        </legend>
        <div className="grid gap-3 md:grid-cols-3">
          <Field label="Usuario">
            <input
              className="input"
              defaultValue={user?.username}
              name="username"
              placeholder="Sin espacios"
              required
            />
          </Field>
          <Field label="Correo">
            <input
              className="input"
              defaultValue={user?.email ?? ''}
              name="email"
              placeholder="correo@dominio.com"
              type="email"
            />
          </Field>
          <Field label="Rol">
            <Select defaultValue={user?.role ?? 'WORKER'} name="role">
              {roles.map((role) => (
                <option key={role} value={role}>
                  {roleLabels[role]}
                </option>
              ))}
            </Select>
          </Field>
        </div>
      </fieldset>

      <fieldset className="space-y-3">
        <legend className="text-[11px] font-semibold uppercase tracking-[0.12em] text-muted-foreground">
          Datos personales
        </legend>
        <div className="grid gap-3 md:grid-cols-3">
          <Field label="Nombre">
            <input
              className="input"
              defaultValue={user?.firstName}
              name="firstName"
              required
            />
          </Field>
          <Field label="Apellido">
            <input
              className="input"
              defaultValue={user?.lastName}
              name="lastName"
              required
            />
          </Field>
          <Field label="Telefono">
            <input
              className="input"
              defaultValue={user?.phone ?? ''}
              name="phone"
              placeholder="+51 9XX XXX XXX"
            />
          </Field>
          <Field label="DNI">
            <input
              className="input"
              defaultValue={user?.dni ?? ''}
              name="dni"
              placeholder="8 digitos"
            />
          </Field>
        </div>
      </fieldset>

      <fieldset className="space-y-3">
        <legend className="text-[11px] font-semibold uppercase tracking-[0.12em] text-muted-foreground">
          Acceso
        </legend>
        <Field label={isEdit ? 'Nueva contrasena' : 'Contrasena inicial'}>
          <input
            className="input"
            minLength={8}
            name="password"
            placeholder={
              isEdit
                ? 'Dejar vacio para conservar la actual'
                : 'Minimo 8 caracteres'
            }
            required={!isEdit}
            type="password"
          />
        </Field>
      </fieldset>

      <div className="flex justify-end">
        <SubmitButton>
          <Plus aria-hidden="true" className="h-4 w-4" />
          {isEdit ? 'Guardar cambios' : 'Crear usuario'}
        </SubmitButton>
      </div>
    </form>
  );
}
