export default function SectionTitle({ children, className = '', as: Component = 'h3', ...props }) {
  return (
    <Component
      className={[
        'font-heading text-[1.15rem] font-bold text-primary m-0',
        'uppercase tracking-wider pl-3 border-l-4 border-primary',
        className,
      ].join(' ')}
      {...props}
    >
      {children}
    </Component>
  )
}
