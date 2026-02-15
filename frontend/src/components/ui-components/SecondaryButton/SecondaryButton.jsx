import { forwardRef } from 'react'
import { cn } from "@/lib/utils"

/**
 * SecondaryButton Component
 * Designed to complement the Primary action without competing for attention.
 * Features a technical aesthetic using 'font-button' (GoogleSansCode).
 */
const SecondaryButton = forwardRef(({ 
    className, 
    variant = 'outline', 
    size = 'default', 
    children, 
    ...props 
  }, ref) => {
    
    const sizeClasses = {
      default: "h-9 px-4 py-2 text-sm",
      sm: "h-8 px-3 text-xs", // Smaller height and padding
      xs: "h-7 px-2 text-[10px]", 
      icon: "h-9 w-9",
    }
  
    const variantClasses = {
      outline: "border border-border bg-background hover:bg-surface-gray text-ink-secondary hover:text-ink shadow-sm",
      ghost: "border-none bg-transparent text-ink-muted hover:bg-surface-gray hover:text-ink shadow-none",
      subtle: "bg-surface-gray/50 text-ink-secondary border-none hover:bg-border/30 hover:text-ink",
    }
  
    return (
      <button
        ref={ref}
        className={cn(
          "inline-flex items-center justify-center gap-2 whitespace-nowrap transition-all duration-200",
          "font-button font-medium tracking-tight", // Removed uppercase for a cleaner look
          "rounded-md disabled:opacity-50 active:scale-[0.97] select-none cursor-pointer",
          variantClasses[variant],
          sizeClasses[size],
          className
        )}
        {...props}
      >
        {children}
      </button>
    )
  })

SecondaryButton.displayName = 'SecondaryButton'

export default SecondaryButton