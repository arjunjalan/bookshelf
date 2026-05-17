const STATUS_COLOR = {
  reading: 'bg-blue-50 text-blue-700',
  read: 'bg-green-50 text-green-700',
  want_to_read: 'bg-amber-50 text-amber-700',
}

const STATUS_LABEL = {
  reading: 'Reading',
  read: 'Read',
  want_to_read: 'Want to Read',
}

export default function Badge({ status, className = '' }) {
  return (
    <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${STATUS_COLOR[status]} ${className}`}>
      {STATUS_LABEL[status]}
    </span>
  )
}
