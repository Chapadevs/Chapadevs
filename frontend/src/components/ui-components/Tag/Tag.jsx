const variants = {
  default: 'bg-surface-gray text-ink-secondary border border-border',
  primary: 'bg-primary/10 text-primary border border-primary/20',
  skill: 'bg-surface-green text-primary-dark border border-primary/20',
  outline: 'border border-primary text-primary bg-transparent',
}

export default function Tag({ variant = 'default', children, className = '', ...props }) {
  return (
    <span
      className={[
        'inline-flex items-center px-2.5 py-1 text-xs font-button font-bold',
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
