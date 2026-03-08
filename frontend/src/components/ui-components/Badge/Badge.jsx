import * as React from "react"
import { cva } from "class-variance-authority"
import { cn } from "@/utils/shadcn"

const badgeVariants = cva(
  "inline-flex items-center px-2.5 py-0.5 text-xs font-bold uppercase tracking-wider transition-colors focus:outline-none rounded-none font-heading",
  {
    variants: {
      variant: {
        // Role Labels
        admin: "bg-primary/10 text-primary border-l-2 border-primary",
        client: "bg-green-100 text-green-700 border-l-2 border-green-500",
        programmer: "bg-blue-100 text-blue-700 border-l-2 border-blue-500",
        user: "bg-gray-100 text-gray-700 border-l-2 border-gray-500",
        // Project Status Labels (per design-pattern)
        holding: "bg-gray-100 text-gray-700 border border-gray-200",
        open: "bg-emerald-50 text-emerald-800 border border-emerald-300",
        ready: "bg-emerald-200 text-emerald-900 border-2 border-emerald-600 font-extrabold shadow-sm",
        development: "bg-emerald-50 text-emerald-800 border border-emerald-300",
        completed: "bg-gray-100 text-gray-700 border border-gray-200",
        cancelled: "bg-gray-100 text-gray-400 border border-gray-200",
        // Semantic
        success: "bg-green-50 text-green-700",
        warning: "bg-amber-50 text-amber-700",
        error: "bg-red-50 text-red-700",
        neutral: "bg-slate-100 text-slate-700",
        default: "bg-slate-100 text-slate-700",
      },
    },
    defaultVariants: {
      variant: "default",
    },
  }
)

function Badge({ className, variant, ...props }) {
  return <div className={cn(badgeVariants({ variant }), className)} {...props} />
}

export { Badge, badgeVariants }
export default Badge