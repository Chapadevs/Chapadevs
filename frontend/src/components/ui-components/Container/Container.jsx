export default function Container({ children, className = '', as: Component = 'div', ...props }) {
  return (
    <Component className={`max-w-[1200px] mx-auto px-8 ${className}`} {...props}>
      {children}
    </Component>
  )
}
