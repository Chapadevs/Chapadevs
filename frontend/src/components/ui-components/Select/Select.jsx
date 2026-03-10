import { forwardRef } from 'react'

const selectBase =
  'inline-flex items-center justify-center font-button font-extrabold w-full select-none ' +
  'rounded-none cursor-pointer transition-all duration-300 ease-in-out ' +
  'hover:-translate-y-0.5 uppercase tracking-wider ' +
  'disabled:opacity-50 disabled:cursor-not-allowed disabled:hover:translate-y-0 ' +
  'px-3 py-2 text-xs border-2 min-h-[28px] bg-white border-primary text-primary ' +
  'focus:border-primary-dark focus:outline-none'

const Select = forwardRef(
  (
    {
      label,
      error,
      required,
      children,
      className = '',
      wrapperClassName = '',
      id,
      ...props
    },
    ref
  ) => {
    return (
      <div className={`flex flex-col gap-1 ${wrapperClassName}`}>
        {label && (
          <label
            htmlFor={id}
            className="font-heading text-xs text-ink-secondary uppercase tracking-wider font-bold"
          >
            {label}
            {required && ' *'}
          </label>
        )}
        <select
          id={id}
          ref={ref}
          className={[
            selectBase,
            error ? 'border-red-600 text-red-600' : '',
            className,
          ].join(' ')}
          {...props}
        >
          {children}
        </select>
        {error && (
          <span className="text-red-600 text-xs font-body">{error}</span>
        )}
      </div>
    )
  }
)

Select.displayName = 'Select'
export default Select
