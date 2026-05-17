const base = 'inline-flex items-center justify-center font-medium rounded-lg transition-colors disabled:opacity-50'

const variants = {
  primary: 'bg-indigo-600 text-white hover:bg-indigo-700',
  ghost: 'border border-stone-200 text-stone-700 hover:bg-stone-50',
}

const sizes = {
  md: 'px-4 py-3 text-sm sm:py-2',
  sm: 'px-3 py-2 text-xs sm:py-1.5',
}

export default function Button({ variant = 'primary', size = 'md', className = '', ...rest }) {
  return (
    <button
      className={`${base} ${variants[variant]} ${sizes[size]} ${className}`}
      {...rest}
    />
  )
}
