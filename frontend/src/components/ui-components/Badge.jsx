const variants = {
  // Semantic badges
  success: 'bg-surface-green text-primary border-l-4 border-l-primary',
  warning: 'bg-amber-50 text-amber-800 border-l-4 border-l-amber-500',
  error: 'bg-red-50 text-red-800 border-l-4 border-l-red-500',
  neutral: 'bg-surface-gray text-ink-secondary border-l-4 border-l-border',
  info: 'bg-blue-50 text-blue-800 border-l-4 border-l-blue-500',

  // Status badges (compact, no left border)
  holding: 'bg-amber-100 text-amber-800',
  open: 'bg-blue-100 text-blue-800',
  ready: 'bg-surface-green text-primary',
  development: 'bg-primary/10 text-primary-dark',
  completed: 'bg-primary text-white',
  cancelled: 'bg-red-100 text-red-800',
  default: 'bg-surface-gray text-ink-secondary',

  // Role badges
  admin: 'bg-primary/10 text-primary border-l-4 border-l-primary',
  client: 'bg-surface-green text-primary-dark border-l-4 border-l-primary-light',
  programmer: 'bg-blue-50 text-blue-800 border-l-4 border-l-blue-500',
  user: 'bg-surface-green text-primary-dark border-l-4 border-l-primary-light',
}

export default function Badge({ variant = 'default', children, className = '', ...props }) {
  return (
    <span
      className={[
        'inline-flex items-center px-2.5 py-1 text-xs font-extrabold font-button',
        'rounded-none uppercase tracking-wider',
        variants[variant] || variants.default,
        className,
      ].join(' ')}
      {...props}
    >
      {children}
    </span>
  )
}
