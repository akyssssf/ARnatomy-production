"use client";

/* Checkbox ala shadcn/ui di atas Radix Checkbox (role="checkbox", aria-checked,
   Space untuk toggle), bergaya kotak biru bertanda centang. */
import * as CheckboxPrimitive from "@radix-ui/react-checkbox";
import type * as React from "react";
import { cn } from "@/lib/utils";

function Checkbox({ className, ...props }: React.ComponentProps<typeof CheckboxPrimitive.Root>) {
  return (
    <CheckboxPrimitive.Root
      className={cn(
        "grid h-4 w-4 shrink-0 place-items-center rounded border border-neutral-300 bg-white transition",
        "data-[state=checked]:border-biru data-[state=checked]:bg-biru",
        className,
      )}
      {...props}
    >
      <CheckboxPrimitive.Indicator>
        <svg
          viewBox="0 0 24 24"
          fill="none"
          stroke="#fff"
          strokeWidth="3"
          strokeLinecap="round"
          strokeLinejoin="round"
          aria-hidden="true"
          className="h-3 w-3"
        >
          <path d="m5 12.5 4.5 4.5L19 7.5" />
        </svg>
      </CheckboxPrimitive.Indicator>
    </CheckboxPrimitive.Root>
  );
}

export { Checkbox };
