"use client";

/* Tabs ala shadcn/ui di atas primitif Radix Tabs.
   Radix mengurus pola WAI-ARIA Tabs: role="tablist"/"tab"/"tabpanel",
   aria-selected, aria-controls, roving tabindex, navigasi panah/Home/End. */
import * as TabsPrimitive from "@radix-ui/react-tabs";
import type * as React from "react";
import { cn } from "@/lib/utils";
import { tab } from "@/lib/variants";

const Tabs = TabsPrimitive.Root;

function TabsList({ className, ...props }: React.ComponentProps<typeof TabsPrimitive.List>) {
  return (
    <TabsPrimitive.List className={cn("mb-5 inline-flex gap-1 rounded-full bg-white p-1", className)} {...props} />
  );
}

/* Varian CVA `tab` dipilih dari data-state Radix (active/inactive) */
function TabsTrigger({ className, ...props }: React.ComponentProps<typeof TabsPrimitive.Trigger>) {
  return (
    <TabsPrimitive.Trigger
      className={cn(
        tab({ terpilih: false }),
        "data-[state=active]:bg-neutral-900 data-[state=active]:text-white",
        className,
      )}
      {...props}
    />
  );
}

function TabsContent({ className, ...props }: React.ComponentProps<typeof TabsPrimitive.Content>) {
  return <TabsPrimitive.Content className={cn("outline-none", className)} {...props} />;
}

export { Tabs, TabsContent, TabsList, TabsTrigger };
