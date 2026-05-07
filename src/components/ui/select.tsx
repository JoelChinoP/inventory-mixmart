"use client";

import {
  Children,
  isValidElement,
  useEffect,
  useId,
  useLayoutEffect,
  useRef,
  useState,
  type ChangeEvent,
  type ReactNode,
} from "react";
import { createPortal } from "react-dom";
import { ChevronDown } from "lucide-react";

import { cn } from "@/lib/utils";

type SelectProps = Omit<
  React.ComponentPropsWithoutRef<"select">,
  "className" | "size"
> & {
  className?: string;
  compactLabel?: string;
  leadingIcon?: ReactNode;
  onValueChange?: (value: string) => void;
  placeholder?: string;
  variant?: "default" | "ink";
};

type SelectOption = {
  disabled?: boolean;
  label: string;
  value: string;
};

type SelectGroup = {
  label: string;
  options: SelectOption[];
};

type SelectItem = SelectOption | SelectGroup;

type MenuPosition = {
  left: number;
  top: number;
  width: number;
  placement: "bottom" | "top";
};

function isGroup(item: SelectItem): item is SelectGroup {
  return "options" in item;
}

function textFromNode(node: ReactNode): string {
  if (typeof node === "string" || typeof node === "number") {
    return String(node);
  }

  if (Array.isArray(node)) {
    return node.map(textFromNode).join("");
  }

  if (isValidElement<{ children?: ReactNode }>(node)) {
    return textFromNode(node.props.children);
  }

  return "";
}

function optionFromElement(child: ReactNode): SelectOption | null {
  if (!isValidElement<{ children?: ReactNode; disabled?: boolean; value?: string }>(
    child,
  )) {
    return null;
  }

  const value = child.props.value;

  if (value === undefined) {
    return null;
  }

  return {
    disabled: child.props.disabled,
    label: textFromNode(child.props.children).trim(),
    value: String(value),
  };
}

function itemsFromChildren(children: ReactNode): SelectItem[] {
  const items: SelectItem[] = [];

  Children.toArray(children).forEach((child) => {
    if (!isValidElement<{ children?: ReactNode; label?: string }>(child)) {
      return;
    }

    if (child.type === "optgroup") {
      items.push({
        label: child.props.label ?? "",
        options: Children.toArray(child.props.children)
          .map(optionFromElement)
          .filter((option): option is SelectOption => Boolean(option)),
      });
      return;
    }

    const option = optionFromElement(child);
    if (option) {
      items.push(option);
    }
  });

  return items;
}

function flatOptions(items: SelectItem[]) {
  return items.flatMap((item) => (isGroup(item) ? item.options : [item]));
}

export function Select({
  children,
  className,
  compactLabel,
  defaultValue,
  disabled,
  id,
  leadingIcon,
  name,
  onChange,
  onValueChange,
  placeholder = "Seleccionar",
  required,
  value,
  variant = "default",
  ...props
}: SelectProps) {
  const generatedId = useId();
  const triggerId = id ?? generatedId;
  const listboxId = `${triggerId}-listbox`;
  const triggerRef = useRef<HTMLButtonElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const [open, setOpen] = useState(false);
  const [position, setPosition] = useState<MenuPosition | null>(null);
  const items = itemsFromChildren(children);
  const options = flatOptions(items);
  const fallbackValue =
    value ?? defaultValue ?? options.find((option) => !option.disabled)?.value ?? "";
  const [internalValue, setInternalValue] = useState(String(fallbackValue));
  const selectedValue = value === undefined ? internalValue : String(value);
  const selectedOption = options.find((option) => option.value === selectedValue);

  useEffect(() => {
    if (!open) return;

    const close = (event: MouseEvent) => {
      const target = event.target as Node;
      if (
        containerRef.current?.contains(target) ||
        document.getElementById(listboxId)?.contains(target)
      ) {
        return;
      }
      setOpen(false);
    };
    const onKey = (event: KeyboardEvent) => {
      if (event.key === "Escape") setOpen(false);
    };

    document.addEventListener("mousedown", close);
    document.addEventListener("keydown", onKey);
    return () => {
      document.removeEventListener("mousedown", close);
      document.removeEventListener("keydown", onKey);
    };
  }, [listboxId, open]);

  useLayoutEffect(() => {
    if (!open) return;

    const updatePosition = () => {
      const rect = triggerRef.current?.getBoundingClientRect();
      if (!rect) return;

      const menuHeight = 288;
      const bottomSpace = window.innerHeight - rect.bottom;
      const placement = bottomSpace < menuHeight && rect.top > menuHeight ? "top" : "bottom";
      setPosition({
        left: Math.max(8, Math.min(rect.left, window.innerWidth - rect.width - 8)),
        top: placement === "bottom" ? rect.bottom + 8 : rect.top - 8,
        width: rect.width,
        placement,
      });
    };

    updatePosition();
    window.addEventListener("resize", updatePosition);
    window.addEventListener("scroll", updatePosition, true);
    return () => {
      window.removeEventListener("resize", updatePosition);
      window.removeEventListener("scroll", updatePosition, true);
    };
  }, [open]);

  const choose = (nextValue: string, optionDisabled?: boolean) => {
    if (optionDisabled) return;
    if (value === undefined) {
      setInternalValue(nextValue);
    }
    onValueChange?.(nextValue);
    setOpen(false);
  };

  const handleNativeChange = (event: ChangeEvent<HTMLSelectElement>) => {
    if (value === undefined) {
      setInternalValue(event.target.value);
    }
    onChange?.(event);
    onValueChange?.(event.target.value);
  };

  const triggerClassName =
    variant === "ink"
      ? "border-ink-foreground/15 bg-ink-foreground/10 text-ink-foreground hover:bg-ink-foreground/15 focus:ring-ink-foreground/15"
      : "border-input bg-surface-elevated text-foreground hover:border-primary-300 focus:ring-focus";

  return (
    <div className="relative w-full" ref={containerRef}>
      <select
        aria-hidden="true"
        className="absolute left-0 top-0 h-px w-px opacity-0"
        disabled={disabled}
        id={triggerId}
        name={name}
        onChange={handleNativeChange}
        required={required}
        tabIndex={-1}
        value={selectedValue}
        {...props}
      >
        {children}
      </select>
      <button
        aria-controls={listboxId}
        aria-expanded={open}
        aria-haspopup="listbox"
        className={cn(
          "flex min-h-11 w-full items-center justify-between gap-3 rounded-[8px] border px-3.5 py-2 text-left text-sm font-medium transition focus:outline-none focus:ring-4 disabled:pointer-events-none disabled:bg-disabled disabled:text-disabled-foreground",
          triggerClassName,
          className,
        )}
        disabled={disabled}
        onClick={() => setOpen((current) => !current)}
        ref={triggerRef}
        type="button"
      >
        {leadingIcon ? (
          <span className={cn("shrink-0", compactLabel ? "sm:hidden" : "")}>
            {leadingIcon}
          </span>
        ) : null}
        <span className={cn("min-w-0 truncate", compactLabel ? "hidden sm:block" : "")}>
          {selectedOption?.label || placeholder}
        </span>
        {compactLabel ? (
          <span className="min-w-0 truncate sm:hidden">{compactLabel}</span>
        ) : null}
        <ChevronDown
          aria-hidden="true"
          className={cn("h-4 w-4 shrink-0 transition", open ? "rotate-180" : "")}
          strokeWidth={2.2}
        />
      </button>
      {open && position
        ? createPortal(
            <div
              className={cn(
                "z-[80] max-h-72 overflow-auto rounded-[10px] border border-border bg-surface-elevated p-1.5 shadow-elevated",
              )}
              id={listboxId}
              role="listbox"
              style={{
                left: position.left,
                minWidth: Math.max(position.width, 208),
                position: "fixed",
                top: position.top,
                transform:
                  position.placement === "top" ? "translateY(-100%)" : undefined,
                width: position.width,
              }}
            >
              {items.map((item) =>
                isGroup(item) ? (
                  <div key={item.label}>
                    <div className="px-3 py-1.5 text-[10px] font-semibold uppercase tracking-[0.12em] text-muted-foreground">
                      {item.label}
                    </div>
                    {item.options.map((option) => (
                      <SelectOptionButton
                        active={option.value === selectedValue}
                        disabled={option.disabled}
                        key={option.value}
                        onChoose={() => choose(option.value, option.disabled)}
                        option={option}
                      />
                    ))}
                  </div>
                ) : (
                  <SelectOptionButton
                    active={item.value === selectedValue}
                    disabled={item.disabled}
                    key={item.value}
                    onChoose={() => choose(item.value, item.disabled)}
                    option={item}
                  />
                ),
              )}
            </div>,
            document.body,
          )
        : null}
    </div>
  );
}

function SelectOptionButton({
  active,
  disabled,
  onChoose,
  option,
}: {
  active: boolean;
  disabled?: boolean;
  onChoose: () => void;
  option: SelectOption;
}) {
  return (
    <button
      aria-selected={active}
      className={cn(
        "flex w-full items-center justify-between gap-3 rounded-[8px] px-3 py-2.5 text-left text-sm transition",
        active
          ? "bg-primary-50 font-semibold text-primary"
          : "text-foreground hover:bg-surface-muted",
        disabled ? "pointer-events-none opacity-45" : "",
      )}
      onClick={onChoose}
      role="option"
      type="button"
    >
      <span className="min-w-0 truncate">{option.label}</span>
      {active ? (
        <span className="h-2.5 w-2.5 shrink-0 rounded-full bg-primary" />
      ) : null}
    </button>
  );
}
