import * as React from "react"
import { cn } from "@/utils/shadcn"

const LINE_HEIGHT = 24
const DEFAULT_MIN_ROWS = 3
const DEFAULT_MAX_HEIGHT = "200px"

const Textarea = React.forwardRef(({ 
  label, 
  error, 
  required, 
  className, 
  wrapperClassName, 
  id, 
  children, 
  autoExpand = false,
  minRows = DEFAULT_MIN_ROWS,
  maxRows,
  maxHeight = DEFAULT_MAX_HEIGHT,
  previewSlot,
  value,
  onChange,
  ...props 
}, ref) => {
  const textareaRef = React.useRef(null)
  const mergedRef = (node) => {
    textareaRef.current = node
    if (typeof ref === "function") ref(node)
    else if (ref) ref.current = node
  }

  const adjustHeight = React.useCallback(() => {
    const el = textareaRef.current
    if (!el || !autoExpand) return
    el.style.height = "auto"
    const scrollH = el.scrollHeight
    const minH = minRows * LINE_HEIGHT
    const cappedH = maxRows ? Math.min(scrollH, maxRows * LINE_HEIGHT) : scrollH
    const finalH = Math.max(minH, cappedH)
    el.style.height = `${finalH}px`
    el.style.overflowY = scrollH > finalH ? "auto" : "hidden"
  }, [autoExpand, minRows, maxRows])

  React.useLayoutEffect(() => {
    if (autoExpand) adjustHeight()
  }, [autoExpand, value, previewSlot, adjustHeight])

  const handleChange = (e) => {
    if (autoExpand) adjustHeight()
    onChange?.(e)
  }

  const textareaProps = { ...props }
  if (value !== undefined) textareaProps.value = value
  if (onChange || autoExpand) textareaProps.onChange = handleChange

  return (
    <div className={cn("flex flex-col gap-2 w-full", wrapperClassName)}>
      {/* Label Logic */}
      {label && (
        <label 
          htmlFor={id} 
          className="font-heading text-[10px] text-ink-muted uppercase tracking-[0.1em] font-bold px-1"
        >
          {label}{required && ' *'}
        </label>
      )}
      
      {/* Visual Container */}
      <div className={cn(
        "relative flex flex-col w-full transition-all duration-300",
        "rounded-none border border-input bg-surface shadow-sm focus-within:ring-1 focus-within:ring-primary/20 focus-within:border-primary",
        error && "border-destructive"
      )}>
        {/* Preview Slot (e.g. image thumbnails) */}
        {previewSlot && (
          <div className="shrink-0 border-b border-border/40">
            {previewSlot}
          </div>
        )}

        <textarea
          id={id}
          ref={mergedRef}
          {...textareaProps}
          className={cn(
            "flex w-full resize-none bg-transparent px-4 py-3",
            "font-body text-base text-ink placeholder:text-muted-foreground/50 focus:outline-none disabled:cursor-not-allowed disabled:opacity-50",
            autoExpand ? "min-h-0 overflow-y-hidden" : "min-h-[100px]",
            className
          )}
          style={autoExpand ? { maxHeight } : undefined}
        />
        
        {/* Action Bar (The Children Slot) */}
        {children && (
          <div className="flex items-center justify-end gap-2 px-3 py-2 bg-surface rounded-none border-t border-border/40">
            {children}
          </div>
        )}
      </div>

      {/* Error Message */}
      {error && (
        <span className="text-destructive text-xs font-body px-1">
          {error}
        </span>
      )}
    </div>
  )
})

Textarea.displayName = "Textarea"

export { Textarea }
