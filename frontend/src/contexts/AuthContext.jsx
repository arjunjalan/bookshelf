import { createContext, useCallback, useContext, useState } from 'react'
import client from '../api/client'

const AuthContext = createContext(null)

export function AuthProvider({ children }) {
  const [token, setToken] = useState(() => localStorage.getItem('bs_token'))
  const [user, setUser] = useState(() => {
    const stored = localStorage.getItem('bs_user')
    return stored ? JSON.parse(stored) : null
  })

  const login = useCallback(async (email, password) => {
    const { data } = await client.post('/auth/login', { email, password })
    localStorage.setItem('bs_token', data.access_token)
    localStorage.setItem('bs_user', JSON.stringify({ email }))
    setToken(data.access_token)
    setUser({ email })
  }, [])

  const register = useCallback(
    async (email, password) => {
      await client.post('/auth/register', { email, password })
      await login(email, password)
    },
    [login]
  )

  const logout = useCallback(() => {
    localStorage.removeItem('bs_token')
    localStorage.removeItem('bs_user')
    setToken(null)
    setUser(null)
  }, [])

  return (
    <AuthContext.Provider value={{ user, token, login, logout, register }}>
      {children}
    </AuthContext.Provider>
  )
}

// eslint-disable-next-line react-refresh/only-export-components
export function useAuth() {
  return useContext(AuthContext)
}
