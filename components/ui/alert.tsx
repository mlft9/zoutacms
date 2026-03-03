import { cn } from "@/lib/utils";
import { AlertCircle, CheckCircle, Info, AlertTriangle } from "lucide-react";

type AlertVariant = "error" | "success" | "warning" | "info";

interface AlertProps {
  variant?: AlertVariant;
  title?: string;
  children: React.ReactNode;
  className?: string;
}

const configs: Record<
  AlertVariant,
  { icon: React.ElementType; styles: string }
> = {
  error: {
    icon: AlertCircle,
    styles:
      "bg-red-50 border-red-200 text-red-800 dark:bg-red-900/20 dark:border-red-800 dark:text-red-300",
  },
  success: {
    icon: CheckCircle,
    styles:
      "bg-green-50 border-green-200 text-green-800 dark:bg-green-900/20 dark:border-green-800 dark:text-green-300",
  },
  warning: {
    icon: AlertTriangle,
    styles:
      "bg-amber-50 border-amber-200 text-amber-800 dark:bg-amber-900/20 dark:border-amber-800 dark:text-amber-300",
  },
  info: {
    icon: Info,
    styles:
      "bg-blue-50 border-blue-200 text-blue-800 dark:bg-blue-900/20 dark:border-blue-800 dark:text-blue-300",
  },
};

export function Alert({
  variant = "info",
  title,
  children,
  className,
}: AlertProps) {
  const { icon: Icon, styles } = configs[variant];

  return (
    <div
      className={cn(
        "flex gap-3 rounded-lg border p-4 text-sm",
        styles,
        className,
      )}
    >
      <Icon className="h-5 w-5 shrink-0 mt-0.5" />
      <div className="flex flex-col gap-1">
        {title && <p className="font-medium">{title}</p>}
        <div>{children}</div>
      </div>
    </div>
  );
}
