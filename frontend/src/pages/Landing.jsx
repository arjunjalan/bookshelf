import { Link } from 'react-router-dom'

const FEATURES = [
  {
    icon: '📚',
    title: 'Log your reading',
    body: 'Track every book — currently reading, finished, or want to read. Import your Goodreads history in one click.',
  },
  {
    icon: '📊',
    title: 'Understand your habits',
    body: 'See your reading pace, favourite genres, top authors, and how your taste has evolved over time.',
  },
  {
    icon: '💬',
    title: 'Ask your companion',
    body: 'A reading companion that knows your history. Ask what to read next and get recommendations that actually fit your taste.',
  },
]

function ProductPreview() {
  return (
    <div className="w-full max-w-md mx-auto rounded-2xl border border-stone-200 bg-white shadow-xl overflow-hidden text-left">
      <div className="flex items-center justify-between px-5 py-4 border-b border-stone-100">
        <div>
          <p className="text-xs font-medium text-stone-400">Bookshelf</p>
          <p className="text-sm font-semibold text-stone-900">Home</p>
        </div>
        <div className="flex items-center gap-1.5 text-[10px] font-medium">
          <span className="text-indigo-600">Shelf</span>
          <span className="text-stone-300">Stats</span>
          <span className="text-stone-300">Chat</span>
        </div>
      </div>

      <div className="p-5 space-y-4">
        <div className="grid grid-cols-3 gap-2">
          {[
            ['24', 'books this year'],
            ['3', 'reading now'],
            ['4.4', 'avg rating'],
          ].map(([value, label]) => (
            <div key={label} className="rounded-lg border border-stone-100 bg-stone-50 p-3">
              <p className="text-xl font-semibold text-stone-900">{value}</p>
              <p className="mt-1 text-[10px] leading-tight text-stone-500">{label}</p>
            </div>
          ))}
        </div>

        <div className="rounded-xl border border-stone-200 p-4">
          <div className="flex items-center justify-between">
            <p className="text-sm font-semibold text-stone-900">Currently reading</p>
            <span className="text-[10px] font-medium text-indigo-600">Reading</span>
          </div>
          <div className="mt-4 flex gap-3">
            <div className="h-20 w-14 flex-shrink-0 rounded bg-gradient-to-br from-indigo-500 to-sky-400 shadow-sm" />
            <div className="min-w-0 flex-1">
              <p className="truncate text-sm font-medium text-stone-900">Tomorrow, and Tomorrow, and Tomorrow</p>
              <p className="mt-1 text-xs text-stone-500">Gabrielle Zevin</p>
              <div className="mt-4 h-2 rounded-full bg-stone-100">
                <div className="h-2 w-2/3 rounded-full bg-indigo-600" />
              </div>
              <p className="mt-2 text-[10px] text-stone-400">67% through</p>
            </div>
          </div>
        </div>

        <div className="grid grid-cols-[1fr_auto] gap-3">
          <div className="rounded-xl border border-stone-200 p-4">
            <p className="text-xs font-medium text-stone-500">Top genre</p>
            <p className="mt-1 text-sm font-semibold text-stone-900">Literary fiction</p>
          </div>
          <div className="rounded-xl border border-stone-200 p-4 text-right">
            <p className="text-xs font-medium text-stone-500">Pace</p>
            <p className="mt-1 text-sm font-semibold text-stone-900">9 days</p>
          </div>
        </div>

        <div className="rounded-xl border border-indigo-100 bg-indigo-50 p-4">
          <p className="text-sm font-semibold text-stone-900">Ask your companion</p>
          <p className="mt-1 text-xs leading-relaxed text-stone-600">
            "What should I read after my last five-star novel?"
          </p>
          <div className="mt-3 inline-flex rounded-full bg-white px-3 py-1 text-[10px] font-medium text-indigo-600 ring-1 ring-indigo-100">
            Uses your shelf and ratings
          </div>
        </div>
      </div>
    </div>
  )
}

export default function Landing() {
  return (
    <div className="min-h-screen bg-stone-50">
      {/* Nav */}
      <nav className="bg-white border-b border-stone-200" style={{ paddingTop: 'env(safe-area-inset-top)' }}>
        <div className="max-w-4xl mx-auto px-4 sm:px-6 h-14 flex items-center justify-between">
          <span className="font-semibold text-stone-900 tracking-tight">Bookshelf</span>
          <div className="flex items-center gap-1">
            <Link to="/login" className="text-sm text-stone-600 hover:text-indigo-600 active:text-indigo-700 transition-colors px-3 py-3 min-h-[44px] inline-flex items-center">
              Log in
            </Link>
            <Link
              to="/register"
              className="text-sm bg-indigo-600 text-white px-4 py-3 rounded-lg font-medium hover:bg-indigo-700 active:bg-indigo-800 transition-colors min-h-[44px] inline-flex items-center"
            >
              Sign up free
            </Link>
          </div>
        </div>
      </nav>

      <main className="max-w-4xl mx-auto px-4 sm:px-6">
        {/* Hero */}
        <div className="py-16 sm:py-24 grid sm:grid-cols-2 gap-12 items-center">
          <div className="flex flex-col gap-6">
            <h1 className="text-4xl sm:text-5xl font-semibold text-stone-900 leading-tight tracking-tight">
              The reading companion that knows your taste
            </h1>
            <p className="text-stone-500 text-lg leading-relaxed">
              Log what you read, discover patterns in your habits, and ask your companion what to read next.
            </p>
            <div className="flex items-center gap-3">
              <Link
                to="/register"
                className="bg-indigo-600 text-white px-6 py-3 rounded-lg font-medium hover:bg-indigo-700 transition-colors text-sm"
              >
                Get started free
              </Link>
              <Link to="/login" className="text-sm text-stone-500 hover:text-indigo-600 transition-colors">
                Already have an account →
              </Link>
            </div>
          </div>
          <ProductPreview />
        </div>

        {/* Features */}
        <div className="pb-20 grid sm:grid-cols-3 gap-6">
          {FEATURES.map((f) => (
            <div key={f.title} className="bg-white rounded-xl border border-stone-200 p-5 flex flex-col gap-3">
              <span className="text-2xl">{f.icon}</span>
              <p className="font-medium text-stone-900 text-sm">{f.title}</p>
              <p className="text-xs text-stone-500 leading-relaxed">{f.body}</p>
            </div>
          ))}
        </div>
      </main>
    </div>
  )
}
