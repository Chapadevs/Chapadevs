import { forwardRef } from 'react'

const Select = forwardRef(({ label, error, required, children, className = '', wrapperClassName = '', id, ...props }, ref) => {
  return (
    <div className={`flex flex-col gap-1 ${wrapperClassName}`}>
      {label && (
        <label
          htmlFor={id}
          className="font-heading text-xs text-ink-secondary uppercase tracking-wider font-bold"
        >
          {label}{required && ' *'}
        </label>
      )}
      <select
        id={id}
        ref={ref}
        className={[
          'w-full px-5 py-3.5 border-2 rounded-none font-body text-sm text-ink',
          'bg-white border-border cursor-pointer',
          'focus:border-primary-light focus:outline-none transition-colors duration-200',
          'disabled:bg-surface-gray disabled:cursor-not-allowed',
          error ? 'border-red-500' : '',
          className,
        ].join(' ')}
        {...props}
      >
        {children}
      </select>
      {error && <span className="text-red-500 text-xs font-body">{error}</span>}
    </div>
  )
})

Select.displayName = 'Select'
export default Select
