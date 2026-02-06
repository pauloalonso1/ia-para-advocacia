"use client";

import { Toast, Toaster, createToaster } from "@ark-ui/react/toast";
import { Portal } from "@ark-ui/react/portal";
import { X, CheckCircle2, AlertCircle, Info } from "lucide-react";

export const toaster = createToaster({
  placement: "bottom-end",
  gap: 16,
  overlap: true,
});

export function ArkToaster() {
  return (
    <Portal>
      <Toaster toaster={toaster}>
        {(toast) => (
          <Toast.Root
            className={`
              rounded-lg shadow-lg border min-w-80 p-4 relative overflow-hidden
              transition-all duration-300 ease-in-out will-change-transform
              h-[var(--height)] opacity-[var(--opacity)]
              translate-x-[var(--x)] translate-y-[var(--y)]
              scale-[var(--scale)] z-[var(--z-index)]
              ${toast.type === "error"
                ? "bg-destructive text-destructive-foreground border-destructive"
                : "bg-card text-card-foreground border-border"
              }
            `}
          >
            <div className="flex items-start gap-3">
              {toast.type === "error" ? (
                <AlertCircle className="w-4 h-4 mt-0.5 flex-shrink-0" />
              ) : toast.type === "success" ? (
                <CheckCircle2 className="w-4 h-4 mt-0.5 flex-shrink-0 text-primary" />
              ) : (
                <Info className="w-4 h-4 mt-0.5 flex-shrink-0 text-primary" />
              )}
              <div className="flex-1">
                <Toast.Title className="font-semibold text-sm">
                  {toast.title}
                </Toast.Title>
                <Toast.Description className="text-sm mt-1 opacity-90">
                  {toast.description}
                </Toast.Description>
              </div>
            </div>
            <Toast.CloseTrigger className="absolute top-3 right-3 p-1 rounded transition-colors opacity-60 hover:opacity-100">
              <X className="w-3 h-3" />
            </Toast.CloseTrigger>
          </Toast.Root>
        )}
      </Toaster>
    </Portal>
  );
}
