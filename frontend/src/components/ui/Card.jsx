export default function Card({ className = '', children, ...rest }) {
  return (
    <div className={`bg-white rounded-xl border border-stone-200 ${className}`} {...rest}>
      {children}
    </div>
  )
}
