import { useRef, useState } from 'react'
import { useMutation, useQueryClient } from '@tanstack/react-query'
import client from '../api/client'

function SummaryReport({ summary }) {
  const { imported, skipped, errors } = summary
  return (
    <div className="flex flex-col gap-4">
      <div className="grid grid-cols-3 gap-3">
        <div className="bg-green-50 border border-green-100 rounded-xl p-4 text-center">
          <p className="text-2xl font-semibold text-green-700">{imported}</p>
          <p className="text-xs text-green-600 mt-1">Imported</p>
        </div>
        <div className="bg-amber-50 border border-amber-100 rounded-xl p-4 text-center">
          <p className="text-2xl font-semibold text-amber-700">{skipped}</p>
          <p className="text-xs text-amber-600 mt-1">Skipped</p>
        </div>
        <div className="bg-red-50 border border-red-100 rounded-xl p-4 text-center">
          <p className="text-2xl font-semibold text-red-700">{errors.length}</p>
          <p className="text-xs text-red-600 mt-1">Errors</p>
        </div>
      </div>

      {skipped > 0 && (
        <p className="text-xs text-stone-400 px-1">
          {skipped} {skipped === 1 ? 'book was' : 'books were'} skipped — already on your shelf (matched by ISBN).
        </p>
      )}

      {errors.length > 0 && (
        <div className="bg-white rounded-xl border border-stone-200 overflow-hidden">
          <p className="text-xs font-medium text-stone-500 px-4 py-2 border-b border-stone-100">
            Rows with errors
          </p>
          <ul className="divide-y divide-stone-100">
            {errors.map((e) => (
              <li key={e.row} className="flex items-start gap-3 px-4 py-2.5">
                <span className="text-xs text-stone-400 w-12 shrink-0">Row {e.row}</span>
                <span className="text-xs text-stone-600">{e.reason}</span>
              </li>
            ))}
          </ul>
        </div>
      )}
    </div>
  )
}

export default function ImportCSV() {
  const queryClient = useQueryClient()
  const fileInputRef = useRef(null)
  const [selectedFile, setSelectedFile] = useState(null)

  const { mutate, isPending, error, reset, data: summary } = useMutation({
    mutationFn: (file) => {
      const formData = new FormData()
      formData.append('file', file)
      return client.post('/import/csv', formData).then((r) => r.data)
    },
    onSuccess: (data) => {
      if (data.imported > 0) {
        queryClient.invalidateQueries({ queryKey: ['reading-logs'] })
        queryClient.invalidateQueries({ queryKey: ['analytics'] })
      }
    },
  })

  function handleFileChange(e) {
    const file = e.target.files?.[0] ?? null
    setSelectedFile(file)
    reset()
  }

  function handleImport() {
    if (selectedFile) mutate(selectedFile)
  }

  function handleReset() {
    setSelectedFile(null)
    reset()
    if (fileInputRef.current) fileInputRef.current.value = ''
  }

  const errorMessage = error?.response?.data?.detail || error?.message || 'Import failed. Please try again.'

  return (
    <div className="max-w-lg">
      <h2 className="text-xl font-semibold text-stone-900 mb-1">Import from Goodreads</h2>
      <p className="text-sm text-stone-500 mb-6">
        Export your library from Goodreads (My Books → Import/Export → Export Library), then upload the CSV file here.
      </p>

      <div className="bg-white rounded-xl border border-stone-200 p-6 flex flex-col gap-5">

        {/* file picker */}
        <div className="flex flex-col gap-2">
          <label className="text-sm font-medium text-stone-700">Goodreads export file</label>
          <div
            className="border-2 border-dashed border-stone-200 rounded-xl p-6 flex flex-col items-center gap-2 cursor-pointer hover:border-stone-300 transition-colors"
            onClick={() => fileInputRef.current?.click()}
          >
            <svg className="w-8 h-8 text-stone-300" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5}
                d="M9 13h6m-3-3v6m5 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
            </svg>
            {selectedFile ? (
              <p className="text-sm font-medium text-stone-700">{selectedFile.name}</p>
            ) : (
              <p className="text-sm text-stone-400">Click to choose a .csv file</p>
            )}
          </div>
          <input
            ref={fileInputRef}
            type="file"
            accept=".csv"
            onChange={handleFileChange}
            className="hidden"
          />
        </div>

        {/* error banner */}
        {error && (
          <p className="text-sm text-red-600 bg-red-50 border border-red-100 rounded-lg px-3 py-2">
            {errorMessage}
          </p>
        )}

        {/* action buttons */}
        <div className="flex gap-2">
          <button
            onClick={handleImport}
            disabled={!selectedFile || isPending}
            className="flex-1 bg-stone-900 text-white rounded-lg py-2.5 text-sm font-medium hover:bg-stone-700 disabled:opacity-50 transition-colors"
          >
            {isPending ? 'Importing…' : 'Import'}
          </button>
          {(selectedFile || summary) && (
            <button
              onClick={handleReset}
              disabled={isPending}
              className="border border-stone-200 text-stone-700 rounded-lg px-4 py-2.5 text-sm hover:bg-stone-50 transition-colors disabled:opacity-50"
            >
              Reset
            </button>
          )}
        </div>
      </div>

      {/* summary report */}
      {summary && (
        <div className="mt-4">
          <SummaryReport summary={summary} />
        </div>
      )}

      {/* instructions */}
      {!summary && (
        <div className="mt-6 bg-white rounded-xl border border-stone-200 p-5">
          <p className="text-xs font-medium text-stone-500 mb-3">How to export from Goodreads</p>
          <ol className="flex flex-col gap-2">
            {[
              'Go to goodreads.com and sign in',
              'Click My Books in the top nav',
              'Click Import and export in the left sidebar',
              'Click Export Library — a CSV file will download',
              'Upload that file here',
            ].map((step, i) => (
              <li key={i} className="flex items-start gap-2.5 text-xs text-stone-500">
                <span className="w-4 h-4 rounded-full bg-stone-100 text-stone-400 flex items-center justify-center shrink-0 font-medium text-[10px]">
                  {i + 1}
                </span>
                {step}
              </li>
            ))}
          </ol>
        </div>
      )}
    </div>
  )
}
