import { forwardRef } from 'react'
import { Link } from 'react-router-dom'

/* ── Variant config: base classes + diagonal-swipe fill color ── */
/* swipe: null → no diagonal-swipe effect (plain button) */
const variants = {
  primary: {
    base: 'bg-primary text-white border-2 border-primary hover:border-primary-dark',
    swipe: 'bg-primary-dark',
  },
  secondary: {
    base: 'bg-white text-primary border-2 border-primary hover:text-white',
    swipe: 'bg-primary',
  },
  ghost: {
    base: 'bg-transparent text-primary border-2 border-transparent hover:text-white',
    swipe: 'bg-primary',
  },
  danger: {
    base: 'bg-red-600 text-white border-2 border-red-600 hover:border-red-700',
    swipe: 'bg-red-700',
  },
  nav: {
    base: 'bg-transparent text-ink border-none hover:text-primary',
    swipe: null,
  },
}

const sizes = {
  xs: 'px-2 py-1 text-[0.65rem] min-h-[24px]',
  sm: 'px-3 py-1.5 text-xs min-h-[28px]',
  md: 'px-4 py-2 text-sm min-h-[36px]',
  lg: 'px-6 py-3 text-base min-h-[44px]',
  hero: 'px-12 py-6 text-base min-w-[250px]',
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
  const v = variants[variant] || variants.primary

  const classes = [
    'group relative inline-flex items-center justify-center font-button font-extrabold',
    'rounded-none cursor-pointer transition-all duration-300 ease-in-out',
    'uppercase tracking-wider overflow-hidden',
    'disabled:opacity-50 disabled:cursor-not-allowed',
    v.base,
    sizes[size] || sizes.md,
    className,
  ].join(' ')

  /* Diagonal swipe span + z-layered content (skip swipe for plain variants) */
  const content = v.swipe ? (
    <>
      <span
        className={`absolute top-0 -left-10 h-full w-0 skew-x-[45deg] ${v.swipe} z-0 transition-all duration-[600ms] ease-out group-hover:w-[160%]`}
        aria-hidden="true"
      />
      <span className="relative z-10 inline-flex items-center gap-1.5">
        {children}
      </span>
    </>
  ) : children

  if (to) {
    return (
      <Link to={to} className={classes} ref={ref} {...props}>
        {content}
      </Link>
    )
  }

  if (href) {
    return (
      <a href={href} className={classes} ref={ref} {...props}>
        {content}
      </a>
    )
  }

  const Component = as || 'button'
  return (
    <Component className={classes} ref={ref} disabled={disabled} {...props}>
      {content}
    </Component>
  )
})

Button.displayName = 'Button'
export default Button
