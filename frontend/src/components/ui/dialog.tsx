"use client";

/* Headless UI ala shadcn/ui di atas primitif Radix Dialog.
   Radix menyediakan perilaku & aksesibilitasnya (role="dialog", aria-modal,
   aria-labelledby, focus trap Tab/Shift+Tab, Escape, pengembalian fokus,
   penguncian gulir); layer ini hanya menambahkan styling Tailwind lewat cn(). */
import * as DialogPrimitive from "@radix-ui/react-dialog";
import type * as React from "react";
import { Ikon } from "@/components/ui/Ikon";
import { cn } from "@/lib/utils";

const Dialog = DialogPrimitive.Root;
const DialogTrigger = DialogPrimitive.Trigger;
const DialogPortal = DialogPrimitive.Portal;
const DialogClose = DialogPrimitive.Close;

function DialogOverlay({ className, ...props }: React.ComponentProps<typeof DialogPrimitive.Overlay>) {
  return (
    <DialogPrimitive.Overlay
      className={cn("fixed inset-0 z-50 bg-neutral-900/45 data-[state=open]:animate-in", className)}
      {...props}
    />
  );
}

function DialogContent({ className, children, ...props }: React.ComponentProps<typeof DialogPrimitive.Content>) {
  return (
    <DialogPortal>
      <DialogOverlay />
      <DialogPrimitive.Content
        aria-modal="true"
        className={cn(
          "fixed left-1/2 z-50 w-[calc(100%-2rem)] max-w-lg -translate-x-1/2 rounded-3xl bg-abu p-2 outline-none",
          "bottom-4 sm:bottom-auto sm:top-1/2 sm:-translate-y-1/2",
          className,
        )}
        {...props}
      >
        {children}
      </DialogPrimitive.Content>
    </DialogPortal>
  );
}

function DialogHeader({ className, ...props }: React.ComponentProps<"header">) {
  return <header className={cn("flex items-start justify-between gap-4 px-4 pb-2 pt-4", className)} {...props} />;
}

function DialogTitle({ className, ...props }: React.ComponentProps<typeof DialogPrimitive.Title>) {
  return <DialogPrimitive.Title className={cn("titik-biru text-xl font-semibold", className)} {...props} />;
}

function DialogDescription({ className, ...props }: React.ComponentProps<typeof DialogPrimitive.Description>) {
  return <DialogPrimitive.Description className={cn("text-xs text-neutral-500", className)} {...props} />;
}

function DialogBody({ className, ...props }: React.ComponentProps<"div">) {
  return <div className={cn("rounded-2xl bg-white p-4", className)} {...props} />;
}

/** Tombol tutup bulat di sudut kanan atas dialog */
function DialogCloseButton({ className, ...props }: React.ComponentProps<typeof DialogPrimitive.Close>) {
  return (
    <DialogPrimitive.Close
      aria-label="Tutup dialog"
      className={cn(
        "grid h-9 w-9 place-items-center rounded-full bg-white text-neutral-500 transition hover:text-neutral-900",
        className,
      )}
      {...props}
    >
      <Ikon nama="silang" />
    </DialogPrimitive.Close>
  );
}

/** Preset aplikasi: dialog yang selalu terbuka saat dipasang (judul + tombol
    tutup + isi); onTutup dipanggil saat Escape, klik overlay, atau tombol tutup. */
function Modal({
  judul,
  onTutup,
  lebar = "max-w-lg",
  children,
}: {
  judul: string;
  onTutup: () => void;
  lebar?: string;
  children: React.ReactNode;
}) {
  return (
    <Dialog
      open
      onOpenChange={(terbuka) => {
        if (!terbuka) onTutup();
      }}
    >
      <DialogContent className={lebar} aria-describedby={undefined}>
        <DialogHeader>
          <DialogTitle>{judul}</DialogTitle>
          <DialogCloseButton />
        </DialogHeader>
        <DialogBody>{children}</DialogBody>
      </DialogContent>
    </Dialog>
  );
}

export {
  Dialog,
  DialogBody,
  DialogClose,
  DialogCloseButton,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogOverlay,
  DialogPortal,
  DialogTitle,
  DialogTrigger,
  Modal,
};
