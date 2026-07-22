import { Loader2 } from "lucide-react";

import { cn } from "@/lib/utils";

interface SpinnerProps extends React.HTMLAttributes<HTMLDivElement> {
  label?: string;
}

function Spinner({ className, label = "Loading", ...props }: SpinnerProps) {
  return (
    <div className={cn("flex items-center gap-3 text-sm text-muted-foreground", className)} role="status" aria-live="polite" {...props}>
      <Loader2 className="h-4 w-4 animate-spin" />
      <span>{label}</span>
    </div>
  );
}

export { Spinner };
