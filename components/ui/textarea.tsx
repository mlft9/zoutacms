import { cn } from "@/lib/utils";
import React from "react";

interface TextareaProps extends React.TextareaHTMLAttributes<HTMLTextAreaElement> {
  error?: string;
}

export function Textarea({ className, error, ...props }: TextareaProps) {
  return (
    <div>
      <textarea
        className={cn(
          "w-full rounded-lg border border-gray-300 bg-white px-3 py-2 text-sm text-gray-900 shadow-sm transition-colors",
          "placeholder:text-gray-400",
          "focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500",
          "disabled:cursor-not-allowed disabled:opacity-50",
          "dark:border-gray-600 dark:bg-gray-800 dark:text-white dark:focus:border-blue-400",
          error && "border-red-500 focus:border-red-500 focus:ring-red-500",
          className,
        )}
        {...props}
      />
      {error && <p className="mt-1 text-xs text-red-500">{error}</p>}
    </div>
  );
}
