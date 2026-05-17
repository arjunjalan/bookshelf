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

function MockUI() {
  return (
    <div className="w-full max-w-md mx-auto rounded-2xl border border-stone-200 bg-white shadow-xl overflow-hidden text-left">
      {/* mock nav */}
      <div className="flex items-center gap-3 px-4 py-3 border-b border-stone-100">
        <div className="w-3 h-3 rounded-full bg-stone-200" />
        <div className="w-3 h-3 rounded-full bg-stone-200" />
        <div className="w-3 h-3 rounded-full bg-stone-200" />
        <div className="flex-1 flex justify-center">
          <div className="h-3 bg-stone-100 rounded w-24" />
        </div>
      </div>
      {/* mock content */}
      <div className="p-5 flex flex-col gap-4">
        <div className="h-4 bg-stone-100 rounded w-40" />
        {/* mock book cards */}
        {[1, 2].map((n) => (
          <div key={n} className="flex gap-3 p-3 rounded-lg border border-stone-100">
            <div className="w-8 h-12 bg-indigo-100 rounded flex-shrink-0" />
            <div className="flex flex-col gap-1.5 flex-1 justify-center">
              <div className="h-2.5 bg-stone-200 rounded w-3/4" />
              <div className="h-2 bg-stone-100 rounded w-1/2" />
              <div className="h-2 bg-blue-100 rounded w-16 mt-0.5" />
            </div>
          </div>
        ))}
        {/* mock chat prompt */}
        <div className="mt-1 rounded-xl border border-indigo-100 bg-indigo-50 p-3 flex flex-col gap-2">
          <div className="h-2 bg-indigo-200 rounded w-40" />
          <div className="flex gap-2 mt-1">
            <div className="flex-1 h-8 bg-white rounded-lg border border-stone-200" />
            <div className="w-14 h-8 bg-indigo-600 rounded-lg" />
          </div>
          <div className="flex gap-1.5">
            <div className="h-5 bg-white border border-stone-200 rounded-full w-28" />
            <div className="h-5 bg-white border border-stone-200 rounded-full w-20" />
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
      <nav className="bg-white border-b border-stone-200">
        <div className="max-w-4xl mx-auto px-4 sm:px-6 h-14 flex items-center justify-between">
          <span className="font-semibold text-stone-900 tracking-tight">Bookshelf</span>
          <div className="flex items-center gap-3">
            <Link to="/login" className="text-sm text-stone-600 hover:text-indigo-600 transition-colors">
              Log in
            </Link>
            <Link
              to="/register"
              className="text-sm bg-indigo-600 text-white px-4 py-1.5 rounded-lg font-medium hover:bg-indigo-700 transition-colors"
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
          <MockUI />
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
