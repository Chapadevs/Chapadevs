import * as React from "react"
import { cn } from "@/utils/shadcn"

const Avatar = React.forwardRef(({ className, ...props }, ref) => (
  <div
    ref={ref}
    className={cn(
      "relative flex h-10 w-10 shrink-0 overflow-hidden rounded-full bg-slate-100", 
      className
    )}
    {...props}
  />
))
Avatar.displayName = "Avatar"

const AvatarImage = React.forwardRef(({ className, src, ...props }, ref) => {
  if (!src) return null
  return (
    <img
      ref={ref}
      className={cn("relative z-10 aspect-square h-full w-full object-cover", className)}
      src={src}
      {...props}
      onError={(e) => {
        e.currentTarget.style.display = 'none'
        if (e.currentTarget.nextElementSibling) {
          e.currentTarget.nextElementSibling.style.display = 'flex'
        }
      }}
    />
  )
})
AvatarImage.displayName = "AvatarImage"

const AvatarFallback = React.forwardRef(({ className, ...props }, ref) => (
  <div
    ref={ref}
    className={cn(
      "absolute inset-0 z-0 flex items-center justify-center rounded-full bg-primary/10 text-primary font-semibold font-heading text-sm uppercase",
      className
    )}
    {...props}
  />
))
AvatarFallback.displayName = "AvatarFallback"

export { Avatar, AvatarImage, AvatarFallback }