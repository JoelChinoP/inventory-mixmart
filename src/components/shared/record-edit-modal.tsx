"use client";

import { Pencil } from "lucide-react";
import type { ReactNode } from "react";

import { FormModal } from "@/components/ui/modal";

import { iconBtnEdit } from "./record-action-styles";

type RecordEditModalProps = {
  title: string;
  description?: string;
  children: ReactNode;
  label?: string;
  size?: "sm" | "md" | "lg" | "xl";
};

export function RecordEditModal({
  title,
  description,
  children,
  label = "Editar",
  size = "lg",
}: RecordEditModalProps) {
  return (
    <FormModal
      description={description}
      size={size}
      title={title}
      trigger={<Pencil aria-hidden="true" data-icon="icon" />}
      triggerAriaLabel={label}
      triggerClassName={iconBtnEdit}
    >
      {children}
    </FormModal>
  );
}
