export default function PageTitle({ children, className = '', ...props }) {
  return (
    <h1
      className={[
        'font-heading text-3xl text-ink m-0 pl-4',
        'border-l-4 border-primary uppercase tracking-tight',
        className,
      ].join(' ')}
      {...props}
    >
      {children}
    </h1>
  )
}
