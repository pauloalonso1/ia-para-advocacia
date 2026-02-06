import { toaster } from "@/components/ui/basic-toast";

interface ToastOptions {
  title?: string;
  description?: string;
  variant?: "default" | "destructive";
  [key: string]: any;
}

function toast({ title, description, variant }: ToastOptions) {
  const type = variant === "destructive" ? "error" : "success";
  toaster.create({
    title: title ?? "",
    description: description ?? "",
    type,
  });
}

function useToast() {
  return {
    toast,
    dismiss: () => toaster.dismiss(),
    toasts: [] as any[],
  };
}

export { useToast, toast };
