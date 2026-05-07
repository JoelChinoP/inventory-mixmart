import type { ReactNode } from "react";

import { cn } from "@/lib/utils";

type DataTableProps = {
  headers: ReactNode[];
  children: ReactNode;
  sticky?: boolean;
  containerClassName?: string;
};

export function DataTable({
  headers,
  children,
  sticky = false,
  containerClassName,
}: DataTableProps) {
  return (
    <div
      className={cn(
        "bg-surface-elevated",
        sticky ? "max-h-[520px] overflow-auto" : "overflow-x-auto",
        containerClassName,
      )}
    >
      <table className="table-operational">
        <thead className={cn("table-operational-head", sticky && "sticky top-0")}>
          <tr>
            {headers.map((header, index) => (
              <th className="px-4 py-3" key={index}>
                {header}
              </th>
            ))}
          </tr>
        </thead>
        <tbody className="divide-y divide-border">{children}</tbody>
      </table>
    </div>
  );
}
