import { createContext, useContext, useEffect, useMemo, useState } from 'react'
import {
  createUserWithEmailAndPassword,
  onAuthStateChanged,
  signInWithEmailAndPassword,
  signOut,
  updateProfile,
} from 'firebase/auth'
import { auth } from '../firebase.js'
import { getUserProfile } from '../utils/profile.js'

const AuthContext = createContext(null)

export function AuthProvider({ children }) {
  const [user, setUser] = useState(null)
  const [profile, setProfile] = useState(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, async (firebaseUser) => {
      setUser(firebaseUser)
      if (firebaseUser) {
        const existingProfile = await getUserProfile(firebaseUser.uid)
        setProfile(existingProfile)
      } else {
        setProfile(null)
      }
      setLoading(false)
    })

    return unsubscribe
  }, [])

  const signup = async ({ email, password, fullName }) => {
    const credential = await createUserWithEmailAndPassword(auth, email, password)
    if (fullName) {
      await updateProfile(credential.user, { displayName: fullName })
      setUser({ ...credential.user, displayName: fullName })
    }
    return credential.user
  }

  const login = (email, password) =>
    signInWithEmailAndPassword(auth, email, password)

  const logout = () => signOut(auth)

  const value = useMemo(
    () => ({
      user,
      profile,
      setProfile,
      loading,
      signup,
      login,
      logout,
    }),
    [user, profile, loading]
  )

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>
}

export function useAuth() {
  const context = useContext(AuthContext)
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider')
  }
  return context
}
