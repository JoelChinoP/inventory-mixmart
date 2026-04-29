"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";

import { requireActiveUser, requireRole } from "@/lib/auth";
import { ADMIN_ROLE, OPERATIONAL_ROLES } from "@/lib/permissions";
import {
  SelfDeactivationError,
  createProductRecord,
  createServiceRecord as createServiceWorkRecord,
  createServiceTypeRecord,
  createStockEntryRecord,
  createStockOutputRecord,
  createSupplierRecord,
  createUserAccount,
  entrySchema,
  hasProfileIdentityConflict,
  idFromForm,
  isInsufficientStockError,
  outputSchema,
  ownProfileUpdateSchema,
  parseForm,
  parseServiceTypeSupplies,
  parseStockEntryItems,
  parseStockOutputItems,
  productSchema,
  productUpdateSchema,
  receiveStockEntryRecord,
  restoreProductRecord,
  restoreServiceTypeRecord,
  restoreSupplierRecord,
  serviceRecordSchema,
  serviceTypeSchema,
  setProductActive,
  setServiceTypeActive,
  setSupplierActive,
  setUserActiveStatus,
  softDeleteProductRecord,
  softDeleteSupplierRecord,
  stringValue,
  supplierSchema,
  supplierUpdateSchema,
  updateProductRecord,
  updateOwnProfile as updateOwnProfileRecord,
  updateSupplierRecord,
  updateUserAccount,
  AvatarUploadError,
  userCreateSchema,
  userUpdateSchema,
  saveProfileAvatar,
} from "@/services";

const adminOnly = [ADMIN_ROLE];

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

export async function createProduct(formData: FormData) {
  await requireRole(adminOnly, "/products");
  const data = parseForm(productSchema, formData);

  await createProductRecord(data);
  revalidateCatalog();
  redirect("/products?success=created");
}

export async function updateProduct(formData: FormData) {
  await requireRole(adminOnly, "/products");
  const data = parseForm(productUpdateSchema, formData);

  await updateProductRecord(data);
  revalidateCatalog();
  redirect("/products?success=updated");
}

export async function deactivateProduct(formData: FormData) {
  await requireRole(adminOnly, "/products");
  await setProductActive(idFromForm(formData), false);
  revalidateCatalog();
}

export async function reactivateProduct(formData: FormData) {
  await requireRole(adminOnly, "/products");
  await setProductActive(idFromForm(formData), true);
  revalidateCatalog();
}

export async function softDeleteProduct(formData: FormData) {
  await requireRole(adminOnly, "/products");
  await softDeleteProductRecord(idFromForm(formData));
  revalidateCatalog();
}

export async function restoreProduct(formData: FormData) {
  await requireRole(adminOnly, "/products");
  await restoreProductRecord(idFromForm(formData));
  revalidateCatalog();
}

export async function createSupplier(formData: FormData) {
  await requireRole(adminOnly, "/suppliers");
  const data = parseForm(supplierSchema, formData);

  await createSupplierRecord(data);
  revalidateCatalog();
  redirect("/suppliers?success=created");
}

export async function updateSupplier(formData: FormData) {
  await requireRole(adminOnly, "/suppliers");
  const data = parseForm(supplierUpdateSchema, formData);

  await updateSupplierRecord(data);
  revalidateCatalog();
  redirect("/suppliers?success=updated");
}

export async function deactivateSupplier(formData: FormData) {
  await requireRole(adminOnly, "/suppliers");
  await setSupplierActive(idFromForm(formData), false);
  revalidateCatalog();
}

export async function reactivateSupplier(formData: FormData) {
  await requireRole(adminOnly, "/suppliers");
  await setSupplierActive(idFromForm(formData), true);
  revalidateCatalog();
}

export async function softDeleteSupplier(formData: FormData) {
  await requireRole(adminOnly, "/suppliers");
  await softDeleteSupplierRecord(idFromForm(formData));
  revalidateCatalog();
}

export async function restoreSupplier(formData: FormData) {
  await requireRole(adminOnly, "/suppliers");
  await restoreSupplierRecord(idFromForm(formData));
  revalidateCatalog();
}

export async function createStockEntry(formData: FormData) {
  const user = await requireRole(OPERATIONAL_ROLES, "/entries");
  const data = parseForm(entrySchema, formData);
  const items = parseStockEntryItems(formData);

  await createStockEntryRecord({
    createdById: user.id,
    data,
    items,
  });
  revalidateOperations();
  redirect("/entries?success=created");
}

export async function receiveStockEntry(formData: FormData) {
  await requireRole(OPERATIONAL_ROLES, "/entries");
  await receiveStockEntryRecord(idFromForm(formData));
  revalidateOperations();
}

export async function createStockOutput(formData: FormData) {
  const user = await requireRole(OPERATIONAL_ROLES, "/outputs");
  const data = parseForm(outputSchema, formData);
  const items = parseStockOutputItems(formData);

  try {
    await createStockOutputRecord({
      createdById: user.id,
      data,
      items,
    });
  } catch (error) {
    if (isInsufficientStockError(error)) {
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
  const supplies = parseServiceTypeSupplies(formData);

  await createServiceTypeRecord({ data, supplies });
  revalidatePath("/services");
  redirect("/services?success=type");
}

export async function deactivateServiceType(formData: FormData) {
  await requireRole(adminOnly, "/services");
  await setServiceTypeActive(idFromForm(formData), false);
  revalidatePath("/services");
}

export async function reactivateServiceType(formData: FormData) {
  await requireRole(adminOnly, "/services");
  await setServiceTypeActive(idFromForm(formData), true);
  revalidatePath("/services");
}

export async function restoreServiceType(formData: FormData) {
  await requireRole(adminOnly, "/services");
  await restoreServiceTypeRecord(idFromForm(formData));
  revalidatePath("/services");
}

export async function createServiceRecord(formData: FormData) {
  const user = await requireRole(OPERATIONAL_ROLES, "/services");
  const data = parseForm(serviceRecordSchema, formData);

  try {
    await createServiceWorkRecord({
      createdById: user.id,
      data,
    });
  } catch (error) {
    if (isInsufficientStockError(error)) {
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

  await createUserAccount(data);
  revalidatePath("/users");
  redirect("/users?success=created");
}

export async function updateUser(formData: FormData) {
  await requireRole(adminOnly, "/users");
  const data = parseForm(userUpdateSchema, formData);

  await updateUserAccount(data);
  revalidatePath("/users");
  redirect("/users?success=updated");
}

export async function setUserActive(formData: FormData) {
  const actor = await requireRole(adminOnly, "/users");

  try {
    await setUserActiveStatus({
      actorId: actor.id,
      id: idFromForm(formData),
      isActive: stringValue(formData, "isActive") === "true",
    });
  } catch (error) {
    if (error instanceof SelfDeactivationError) {
      redirect("/users?error=self");
    }
    throw error;
  }

  revalidatePath("/users");
}

export async function updateOwnProfile(formData: FormData) {
  const user = await requireActiveUser("/profile");
  const data = parseForm(ownProfileUpdateSchema, formData);
  const avatar = formData.get("avatar");
  const removeAvatar = stringValue(formData, "removeAvatar") === "true";
  let avatarUrl: string | undefined;

  if (
    await hasProfileIdentityConflict({
      id: user.id,
      email: data.email,
      dni: data.dni,
    })
  ) {
    redirect("/profile?error=duplicate");
  }

  try {
    if (avatar instanceof File && avatar.size > 0) {
      avatarUrl = await saveProfileAvatar({
        userId: user.id,
        file: avatar,
        previousAvatarUrl: user.avatarUrl,
      });
    }
  } catch (error) {
    if (error instanceof AvatarUploadError) {
      redirect(`/profile?error=${error.code}`);
    }

    throw error;
  }

  await updateOwnProfileRecord({
    id: user.id,
    data,
    avatarUrl,
    removeAvatar: removeAvatar && !avatarUrl,
  });
  revalidatePath("/profile");
  revalidatePath("/dashboard");
  redirect("/profile?success=profile");
}

export async function requireCurrentUser() {
  return requireActiveUser();
}
