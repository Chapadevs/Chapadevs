import { forwardRef } from 'react'
import { Link } from 'react-router-dom'

const variants = {
  primary: 'bg-primary text-white border-2 border-primary hover:bg-primary-dark hover:border-primary-dark',
  secondary: 'bg-white text-primary border-2 border-primary hover:bg-primary hover:text-white',
  ghost: 'bg-transparent text-primary border-2 border-transparent hover:bg-primary/10',
  danger: 'bg-red-600 text-white border-2 border-red-600 hover:bg-red-700 hover:border-red-700',
}

const sizes = {
  xs: 'px-2 py-0 text-[0.65rem] min-h-[18px]',
  sm: 'px-3 py-0 text-xs min-h-[22px]',
  md: 'px-4 py-0 text-sm min-h-[26px]',
  lg: 'px-6 py-px text-base min-h-[30px]',
  hero: 'px-12 py-1 text-base min-w-[250px]',
}

const Button = forwardRef(({
  variant = 'primary',
  size = 'md',
  as,
  to,
  href,
  children,
  className = '',
  disabled,
  ...props
}, ref) => {
  const classes = [
    'inline-flex items-center justify-center font-button font-extrabold',
    'rounded-none cursor-pointer transition-all duration-300 ease-in-out',
    'hover:-translate-y-0.5 uppercase tracking-wider',
    'disabled:opacity-50 disabled:cursor-not-allowed disabled:hover:translate-y-0',
    variants[variant] || variants.primary,
    sizes[size] || sizes.md,
    className,
  ].join(' ')

  if (to) {
    return (
      <Link to={to} className={classes} ref={ref} {...props}>
        {children}
      </Link>
    )
  }

  if (href) {
    return (
      <a href={href} className={classes} ref={ref} {...props}>
        {children}
      </a>
    )
  }

  const Component = as || 'button'
  return (
    <Component className={classes} ref={ref} disabled={disabled} {...props}>
      {children}
    </Component>
  )
})

Button.displayName = 'Button'
export default Button
