import { forwardRef } from 'react'
import { cn } from "@/lib/utils"

const Textarea = forwardRef(({ label, error, required, className, wrapperClassName, id, children, ...props }, ref) => {
  return (
    <div className={cn("flex flex-col gap-2 w-full", wrapperClassName)}>
      {label && (
        <label htmlFor={id} className="font-heading text-[10px] text-ink-muted uppercase tracking-[0.1em] font-bold px-1">
          {label}{required && ' *'}
        </label>
      )}
      
      <div className={cn(
        "relative flex flex-col w-full transition-all duration-300",
        "rounded-xl border border-border bg-surface shadow-sm focus-within:ring-1 focus-within:ring-primary/20 focus-within:border-primary",
        error && "border-destructive"
      )}>
        <textarea
          id={id}
          ref={ref}
          className={cn(
            "flex min-h-[100px] w-full resize-none bg-transparent px-4 py-3",
            "font-body text-base text-ink placeholder:text-ink-muted/50 focus:outline-none",
            className
          )}
          {...props}
        />
        
        {/* ACTION BAR: This is the part that was missing or hardcoded */}
        {children && (
          <div className="flex items-center justify-end gap-2 px-3 py-2 bg-surface-gray/30 rounded-b-xl border-t border-border/40">
            {children}
          </div>
        )}
      </div>
      {error && <span className="text-destructive text-xs font-body px-1">{error}</span>}
    </div>
  )
})

Textarea.displayName = 'Textarea'
export default Textarea