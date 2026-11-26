import * as React from "react";
import * as AlertDialogPrimitive from "@radix-ui/react-alert-dialog";

const AlertDialog = AlertDialogPrimitive.Root;
const AlertDialogTrigger = AlertDialogPrimitive.Trigger;
const AlertDialogPortal = AlertDialogPrimitive.Portal;

function AlertDialogOverlay({
  className = "",
  ...props
}: React.ComponentPropsWithoutRef<typeof AlertDialogPrimitive.Overlay>) {
  return (
    <AlertDialogPrimitive.Overlay
      className={`fixed inset-0 z-50 bg-[#16130F]/40 backdrop-blur-[2px] transition-opacity data-[state=open]:animate-in data-[state=closed]:animate-out data-[state=closed]:fade-out-0 data-[state=open]:fade-in-0 ${className}`}
      {...props}
    />
  );
}

function AlertDialogContent({
  className = "",
  ...props
}: React.ComponentPropsWithoutRef<typeof AlertDialogPrimitive.Content>) {
  return (
    <AlertDialogPortal>
      <AlertDialogOverlay />
      <AlertDialogPrimitive.Content
        className={`fixed left-[50%] top-[50%] z-50 grid w-full max-w-md translate-x-[-50%] translate-y-[-50%] gap-4 border border-[var(--border)] bg-[var(--card)] p-6 shadow-xl rounded-lg duration-200 font-sans text-[var(--foreground)] focus:outline-none ${className}`}
        {...props}
      />
    </AlertDialogPortal>
  );
}

function AlertDialogHeader({
  className = "",
  ...props
}: React.HTMLAttributes<HTMLDivElement>) {
  return (
    <div
      className={`flex flex-col space-y-1.5 text-left ${className}`}
      {...props}
    />
  );
}

function AlertDialogFooter({
  className = "",
  ...props
}: React.HTMLAttributes<HTMLDivElement>) {
  return (
    <div
      className={`flex flex-row items-center justify-end gap-3 pt-3 ${className}`}
      {...props}
    />
  );
}

function AlertDialogTitle({
  className = "",
  ...props
}: React.ComponentPropsWithoutRef<typeof AlertDialogPrimitive.Title>) {
  return (
    <AlertDialogPrimitive.Title
      className={`text-lg font-semibold tracking-tight text-[var(--foreground)] ${className}`}
      {...props}
    />
  );
}

function AlertDialogDescription({
  className = "",
  ...props
}: React.ComponentPropsWithoutRef<typeof AlertDialogPrimitive.Description>) {
  return (
    <AlertDialogPrimitive.Description
      className={`text-sm text-[var(--muted-foreground)] leading-relaxed ${className}`}
      {...props}
    />
  );
}

function AlertDialogAction({
  className = "",
  isDestructive = false,
  ...props
}: React.ComponentPropsWithoutRef<typeof AlertDialogPrimitive.Action> & {
  isDestructive?: boolean;
}) {
  return (
    <AlertDialogPrimitive.Action
      className={`inline-flex items-center justify-center px-4 py-2 text-xs font-mono uppercase tracking-wider font-medium rounded-md transition-colors focus:outline-none focus:ring-2 focus:ring-offset-2 ${
        isDestructive
          ? "bg-[var(--destructive)] text-white hover:bg-[var(--destructive)]/90 focus:ring-[var(--destructive)]"
          : "bg-[var(--primary)] text-[var(--primary-foreground)] hover:bg-[var(--primary)]/90 focus:ring-[var(--primary)]"
      } ${className}`}
      {...props}
    />
  );
}

function AlertDialogCancel({
  className = "",
  ...props
}: React.ComponentPropsWithoutRef<typeof AlertDialogPrimitive.Cancel>) {
  return (
    <AlertDialogPrimitive.Cancel
      className={`inline-flex items-center justify-center px-4 py-2 text-xs font-mono uppercase tracking-wider font-medium rounded-md border border-[var(--border)] bg-[var(--background)] text-[var(--foreground)] hover:bg-[var(--muted)] transition-colors focus:outline-none focus:ring-2 focus:ring-[var(--primary)] ${className}`}
      {...props}
    />
  );
}

export {
  AlertDialog,
  AlertDialogPortal,
  AlertDialogOverlay,
  AlertDialogTrigger,
  AlertDialogContent,
  AlertDialogHeader,
  AlertDialogFooter,
  AlertDialogTitle,
  AlertDialogDescription,
  AlertDialogAction,
  AlertDialogCancel,
};
