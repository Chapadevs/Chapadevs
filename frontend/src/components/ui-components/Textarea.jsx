import { forwardRef } from 'react'

const Textarea = forwardRef(({ label, error, required, className = '', wrapperClassName = '', id, ...props }, ref) => {
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
      <textarea
        id={id}
        ref={ref}
        className={[
          'w-full px-5 py-3.5 border-2 rounded-none font-body text-sm text-ink',
          'bg-white border-border placeholder:text-ink-muted resize-vertical',
          'focus:border-primary-light focus:outline-none transition-colors duration-200',
          'disabled:bg-surface-gray disabled:cursor-not-allowed',
          error ? 'border-red-500' : '',
          className,
        ].join(' ')}
        {...props}
      />
      {error && <span className="text-red-500 text-xs font-body">{error}</span>}
    </div>
  )
})

Textarea.displayName = 'Textarea'
export default Textarea
