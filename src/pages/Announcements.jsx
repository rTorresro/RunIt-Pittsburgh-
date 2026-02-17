import { useEffect, useState } from 'react'
import { addDoc, collection, onSnapshot, orderBy, query, serverTimestamp } from 'firebase/firestore'
import { db } from '../firebase.js'
import { COLLECTIONS } from '../constants/firestore.js'
import { useAuth } from '../context/AuthContext.jsx'
import { formatTimeAgo } from '../utils/time.js'

function Announcements() {
  const { user, profile } = useAuth()
  const [announcements, setAnnouncements] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [formState, setFormState] = useState({ title: '', body: '' })
  const [submitting, setSubmitting] = useState(false)

  useEffect(() => {
    const announcementsQuery = query(
      collection(db, COLLECTIONS.ANNOUNCEMENTS),
      orderBy('created_at', 'desc')
    )
    const unsubscribe = onSnapshot(
      announcementsQuery,
      (snapshot) => {
        const docs = snapshot.docs.map((docSnap) => ({
          id: docSnap.id,
          ...docSnap.data(),
        }))
        setAnnouncements(docs)
        setLoading(false)
      },
      (err) => {
        console.error('Announcements error', err)
        setError('Unable to load announcements.')
        setLoading(false)
      }
    )

    return unsubscribe
  }, [])

  const handleChange = (event) => {
    const { name, value } = event.target
    setFormState((prev) => ({ ...prev, [name]: value }))
  }

  const handleSubmit = async (event) => {
    event.preventDefault()
    if (!user) return
    setSubmitting(true)
    setError('')
    try {
      await addDoc(collection(db, COLLECTIONS.ANNOUNCEMENTS), {
        title: formState.title.trim(),
        body: formState.body.trim(),
        created_at: serverTimestamp(),
        created_by: user.uid,
        author_name: profile?.name || user.displayName || 'Organizer',
      })
      setFormState({ title: '', body: '' })
    } catch (err) {
      setError('Unable to post announcement.')
    } finally {
      setSubmitting(false)
    }
  }

  return (
    <div className="flex min-h-[calc(100vh-4.25rem)] items-start justify-center px-4 py-10">
      <div className="w-full max-w-2xl rounded-3xl border border-slate-800 bg-slate-900/80 p-6 shadow-xl">
        <h1 className="text-2xl font-semibold text-slate-50">Announcements</h1>
        <p className="mt-1 text-sm text-slate-400">
          Updates about runs, events, and court changes.
        </p>

        <form className="mt-6 space-y-3" onSubmit={handleSubmit}>
          <input
            type="text"
            name="title"
            value={formState.title}
            onChange={handleChange}
            placeholder="Announcement title"
            className="w-full rounded-xl border border-slate-800 bg-slate-950/60 px-4 py-3 text-sm text-slate-100 outline-none transition focus:border-orange-500"
            maxLength={80}
            required
          />
          <textarea
            name="body"
            value={formState.body}
            onChange={handleChange}
            placeholder="Share updates with the community..."
            className="min-h-[120px] w-full rounded-xl border border-slate-800 bg-slate-950/60 px-4 py-3 text-sm text-slate-100 outline-none transition focus:border-orange-500"
            maxLength={500}
            required
          />
          <button
            type="submit"
            className="w-full rounded-xl bg-orange-500 px-4 py-3 text-sm font-semibold text-slate-950 transition hover:bg-orange-400"
            disabled={submitting || !user}
          >
            {user ? (submitting ? 'Posting...' : 'Post Announcement') : 'Sign in to post'}
          </button>
        </form>

        {error && (
          <div className="mt-4 rounded-xl border border-orange-500/40 bg-orange-500/10 px-4 py-3 text-xs text-orange-200">
            {error}
          </div>
        )}

        <div className="mt-6 space-y-4">
          {loading ? (
            <div className="space-y-3 animate-pulse">
              <div className="h-20 rounded-2xl bg-slate-800/60" />
              <div className="h-20 rounded-2xl bg-slate-800/60" />
            </div>
          ) : announcements.length === 0 ? (
            <div className="rounded-2xl border border-dashed border-slate-800 bg-slate-950/40 p-4 text-sm text-slate-400">
              No announcements yet.
            </div>
          ) : (
            announcements.map((announcement) => (
              <div
                key={announcement.id}
                className="rounded-2xl border border-slate-800 bg-slate-950/60 p-4"
              >
                <div className="flex items-center justify-between">
                  <p className="text-sm font-semibold text-slate-100">{announcement.title}</p>
                  <p className="text-xs text-slate-500">
                    {formatTimeAgo(announcement.created_at)}
                  </p>
                </div>
                <p className="mt-2 text-sm text-slate-300">{announcement.body}</p>
                <p className="mt-2 text-xs text-slate-500">
                  Posted by {announcement.author_name || 'Organizer'}
                </p>
              </div>
            ))
          )}
        </div>
      </div>
    </div>
  )
}

export default Announcements
