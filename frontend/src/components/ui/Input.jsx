import { forwardRef } from 'react'

const base =
  'border border-stone-200 rounded-lg px-3 py-2.5 text-base sm:text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 transition-colors w-full'

export const Input = forwardRef(function Input({ className = '', ...rest }, ref) {
  return <input ref={ref} className={`${base} ${className}`} {...rest} />
})

export function Textarea({ className = '', ...rest }) {
  return <textarea className={`${base} ${className}`} {...rest} />
}

export function Select({ className = '', ...rest }) {
  return <select className={`${base} bg-white ${className}`} {...rest} />
}
