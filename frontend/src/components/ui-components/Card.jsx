const variants = {
  default: 'bg-white border border-border shadow-md',
  elevated: 'bg-white border border-border shadow-lg hover:shadow-xl transition-shadow duration-300',
  accent: 'bg-white border-t-[6px] border-t-primary border-x border-b border-border shadow-md',
  ghost: 'bg-surface-gray border border-border',
  outline: 'bg-white border-2 border-primary/20 shadow-xl',
}

export default function Card({ variant = 'default', children, className = '', as: Tag = 'div', ...props }) {
  return (
    <Tag
      className={`rounded-none ${variants[variant] || variants.default} ${className}`}
      {...props}
    >
      {children}
    </Tag>
  )
}
