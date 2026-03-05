import { cn } from "@/lib/utils";
import { ChevronDown } from "lucide-react";
import React from "react";

interface SelectProps extends React.SelectHTMLAttributes<HTMLSelectElement> {
  error?: string;
}

export function Select({ className, error, children, ...props }: SelectProps) {
  return (
    <div className="relative">
      <select
        className={cn(
          "w-full appearance-none rounded-lg border border-gray-300 bg-white px-3 py-2 pr-8 text-sm text-gray-900 shadow-sm transition-colors",
          "placeholder:text-gray-400",
          "focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500",
          "disabled:cursor-not-allowed disabled:opacity-50",
          "dark:border-gray-600 dark:bg-gray-800 dark:text-white dark:focus:border-blue-400",
          error && "border-red-500 focus:border-red-500 focus:ring-red-500",
          className,
        )}
        {...props}
      >
        {children}
      </select>
      <ChevronDown className="pointer-events-none absolute right-2 top-1/2 h-4 w-4 -translate-y-1/2 text-gray-400" />
      {error && <p className="mt-1 text-xs text-red-500">{error}</p>}
    </div>
  );
}
