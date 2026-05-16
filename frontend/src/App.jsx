import { Navigate, Route, Routes } from 'react-router-dom'
import ProtectedRoute from './components/ProtectedRoute'
import Layout from './components/Layout'
import Login from './pages/Login'
import Register from './pages/Register'
import Books from './pages/Books'
import AddBook from './pages/AddBook'
import BookDetail from './pages/BookDetail'
import Stats from './pages/Stats'
import Chat from './pages/Chat'
import ImportCSV from './pages/ImportCSV'
import NotFound from './pages/NotFound'

export default function App() {
  return (
    <Routes>
      <Route path="/" element={<Navigate to="/books" replace />} />
      <Route path="/login" element={<Login />} />
      <Route path="/register" element={<Register />} />
      <Route element={<ProtectedRoute />}>
        <Route element={<Layout />}>
          <Route path="/books" element={<Books />} />
          <Route path="/books/add" element={<AddBook />} />
          <Route path="/books/:id" element={<BookDetail />} />
          <Route path="/stats" element={<Stats />} />
          <Route path="/chat" element={<Chat />} />
          <Route path="/import" element={<ImportCSV />} />
        </Route>
      </Route>
      <Route path="*" element={<NotFound />} />
    </Routes>
  )
}
