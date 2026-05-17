import { Route, Routes } from 'react-router-dom'
import ProtectedRoute from './components/ProtectedRoute'
import Layout from './components/Layout'
import Landing from './pages/Landing'
import Login from './pages/Login'
import Register from './pages/Register'
import Home from './pages/Home'
import Books from './pages/Books'
import AddBook from './pages/AddBook'
import BookDetail from './pages/BookDetail'
import Stats from './pages/Stats'
import Chat from './pages/Chat'
import ImportCSV from './pages/ImportCSV'
import Feed from './pages/Feed'
import Settings from './pages/Settings'
import UserProfile from './pages/UserProfile'
import NotFound from './pages/NotFound'

export default function App() {
  return (
    <Routes>
      <Route path="/" element={<Landing />} />
      <Route path="/login" element={<Login />} />
      <Route path="/register" element={<Register />} />
      <Route element={<ProtectedRoute />}>
        <Route element={<Layout />}>
          <Route path="/home" element={<Home />} />
          <Route path="/books" element={<Books />} />
          <Route path="/books/add" element={<AddBook />} />
          <Route path="/books/:id" element={<BookDetail />} />
          <Route path="/stats" element={<Stats />} />
          <Route path="/chat" element={<Chat />} />
          <Route path="/import" element={<ImportCSV />} />
          <Route path="/feed" element={<Feed />} />
          <Route path="/settings" element={<Settings />} />
          <Route path="/users/:handle" element={<UserProfile />} />
        </Route>
      </Route>
      <Route path="*" element={<NotFound />} />
    </Routes>
  )
}
