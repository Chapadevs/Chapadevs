const variants = {
  error: 'bg-red-50 border-l-4 border-l-red-500 text-red-800',
  success: 'bg-surface-green border-l-4 border-l-primary text-primary-dark',
  info: 'bg-blue-50 border-l-4 border-l-blue-500 text-blue-800',
  warning: 'bg-amber-50 border-l-4 border-l-amber-500 text-amber-800',
}

export default function Alert({ variant = 'info', children, className = '', ...props }) {
  if (!children) return null
  return (
    <div
      className={[
        'px-4 py-3 rounded-none text-sm font-body',
        variants[variant] || variants.info,
        className,
      ].join(' ')}
      role="alert"
      {...props}
    >
      {children}
    </div>
  )
}
