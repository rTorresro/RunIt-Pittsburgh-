import { useEffect, useMemo, useRef, useState } from 'react'
import {
  addDoc,
  collection,
  doc,
  getDocs,
  limit,
  onSnapshot,
  orderBy,
  query,
  serverTimestamp,
  setDoc,
  startAfter,
  updateDoc,
  where,
  Timestamp,
} from 'firebase/firestore'
import { db } from '../../firebase.js'
import { COLLECTIONS } from '../../constants/firestore.js'
import { formatTimeAgo, MINUTE_MS } from '../../utils/time.js'

const MESSAGE_LIMIT = 50
const EDIT_WINDOW_MS = 5 * MINUTE_MS
const TYPING_IDLE_MS = 1500
const PRESENCE_WINDOW_MS = 2 * MINUTE_MS
const REPORT_HOLD_MS = 700
const RATE_LIMIT_COUNT = 10
const RATE_LIMIT_WINDOW_MS = 60 * MINUTE_MS

function CourtChatSection({
  courtId,
  courtName,
  user,
  profile,
  checkedInUserIds,
}) {
  const [messages, setMessages] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [input, setInput] = useState('')
  const [sending, setSending] = useState(false)
  const [editingId, setEditingId] = useState(null)
  const [editingText, setEditingText] = useState('')
  const [lastDoc, setLastDoc] = useState(null)
  const [hasMore, setHasMore] = useState(true)
  const [typingUsers, setTypingUsers] = useState([])
  const [presenceUsers, setPresenceUsers] = useState([])
  const [pinnedMessages, setPinnedMessages] = useState([])

  const listRef = useRef(null)
  const typingTimeoutRef = useRef(null)
  const sendTimesRef = useRef([])
  const isMountedRef = useRef(false)

  const isModerator = Boolean(profile?.is_admin || profile?.role === 'admin')

  const messagesRef = useMemo(
    () => collection(db, COLLECTIONS.COURTS, courtId, 'messages'),
    [courtId]
  )
  const typingRef = useMemo(
    () => collection(db, COLLECTIONS.COURTS, courtId, 'typing'),
    [courtId]
  )
  const presenceRef = useMemo(
    () => collection(db, COLLECTIONS.COURTS, courtId, 'presence'),
    [courtId]
  )

  const scrollToBottom = (smooth = true) => {
    if (!listRef.current) return
    listRef.current.scrollTo({
      top: listRef.current.scrollHeight,
      behavior: smooth ? 'smooth' : 'auto',
    })
  }

  useEffect(() => {
    isMountedRef.current = true
    return () => {
      isMountedRef.current = false
    }
  }, [])

  useEffect(() => {
    setLoading(true)
    const baseQuery = query(messagesRef, orderBy('timestamp', 'desc'), limit(MESSAGE_LIMIT))
    const unsubscribe = onSnapshot(
      baseQuery,
      (snapshot) => {
        const docs = snapshot.docs.map((docSnap) => ({
          id: docSnap.id,
          ...docSnap.data(),
        }))
        setLastDoc(snapshot.docs[snapshot.docs.length - 1] || null)
        setHasMore(snapshot.docs.length === MESSAGE_LIMIT)
        setMessages(docs.reverse())
        setLoading(false)
        setError('')
        if (isMountedRef.current) {
          scrollToBottom()
          localStorage.setItem(`runit_last_read_${courtId}`, String(Date.now()))
        }
      },
      (err) => {
        console.error('Chat listener error', err)
        setError('Unable to load chat messages.')
        setLoading(false)
      }
    )

    return unsubscribe
  }, [courtId, messagesRef])

  useEffect(() => {
    const pinnedQuery = query(messagesRef, where('pinned', '==', true))
    const unsubscribe = onSnapshot(pinnedQuery, (snapshot) => {
      const docs = snapshot.docs.map((docSnap) => ({
        id: docSnap.id,
        ...docSnap.data(),
      }))
      setPinnedMessages(docs)
    })

    return unsubscribe
  }, [messagesRef])

  useEffect(() => {
    const now = Timestamp.fromMillis(Date.now() - 10000)
    const typingQuery = query(typingRef, where('is_typing', '==', true))
    const unsubscribe = onSnapshot(typingQuery, (snapshot) => {
      const users = snapshot.docs
        .map((docSnap) => docSnap.data())
        .filter((entry) => entry.updated_at?.toDate && entry.updated_at.toDate() > now.toDate())
        .filter((entry) => entry.user_id !== user?.uid)
      setTypingUsers(users)
    })
    return unsubscribe
  }, [typingRef, user?.uid])

  useEffect(() => {
    if (!user) return
    const presenceQuery = query(
      presenceRef,
      where('last_seen', '>=', Timestamp.fromMillis(Date.now() - PRESENCE_WINDOW_MS))
    )
    const unsubscribe = onSnapshot(presenceQuery, (snapshot) => {
      const users = snapshot.docs.map((docSnap) => docSnap.data())
      setPresenceUsers(users)
    })

    return unsubscribe
  }, [presenceRef, user])

  useEffect(() => {
    if (!user) return
    const updatePresence = async () => {
      await setDoc(
        doc(presenceRef, user.uid),
        {
          user_id: user.uid,
          user_name: profile?.name || user.displayName || 'Hooper',
          user_photo: profile?.photo_url || '',
          last_seen: serverTimestamp(),
          is_checked_in: checkedInUserIds.has(user.uid),
        },
        { merge: true }
      )
    }

    updatePresence()
    const interval = setInterval(updatePresence, 30000)
    return () => clearInterval(interval)
  }, [presenceRef, user, profile, checkedInUserIds])

  useEffect(() => {
    if (!user) return
    const updateTyping = async (isTyping) => {
      await setDoc(
        doc(typingRef, user.uid),
        {
          is_typing: isTyping,
          updated_at: serverTimestamp(),
          user_id: user.uid,
          user_name: profile?.name || user.displayName || 'Hooper',
          user_photo: profile?.photo_url || '',
        },
        { merge: true }
      )
    }

    return () => {
      updateTyping(false).catch(() => {})
    }
  }, [typingRef, user, profile])

  const handleLoadOlder = async () => {
    if (!lastDoc || !hasMore) return
    const olderQuery = query(
      messagesRef,
      orderBy('timestamp', 'desc'),
      startAfter(lastDoc),
      limit(MESSAGE_LIMIT)
    )
    const snapshot = await getDocs(olderQuery)
    const docs = snapshot.docs.map((docSnap) => ({
      id: docSnap.id,
      ...docSnap.data(),
    }))
    setLastDoc(snapshot.docs[snapshot.docs.length - 1] || null)
    setHasMore(snapshot.docs.length === MESSAGE_LIMIT)
    setMessages((prev) => [...docs.reverse(), ...prev])
  }

  const canSend = input.trim().length > 0 && input.trim().length <= 500

  const handleSend = async () => {
    if (!user || !canSend) return
    const now = Date.now()
    sendTimesRef.current = sendTimesRef.current.filter(
      (time) => now - time < RATE_LIMIT_WINDOW_MS
    )
    if (sendTimesRef.current.length >= RATE_LIMIT_COUNT) {
      setError('Slow down! You can send 10 messages per minute.')
      return
    }

    setSending(true)
    setError('')
    try {
      await addDoc(messagesRef, {
        user_id: user.uid,
        user_name: profile?.name || user.displayName || 'Hooper',
        user_photo: profile?.photo_url || '',
        message_text: input.trim(),
        timestamp: serverTimestamp(),
        edited: false,
        deleted: false,
        pinned: false,
        mentions: input
          .split(/\s+/)
          .filter((word) => word.startsWith('@'))
          .map((word) => word.replace('@', '').toLowerCase()),
      })
      sendTimesRef.current.push(now)
      setInput('')
      setEditingId(null)
      setEditingText('')
      await updateDoc(doc(typingRef, user.uid), {
        is_typing: false,
        updated_at: serverTimestamp(),
      })
    } catch (err) {
      console.error('Send message error', err)
      setError('Unable to send message.')
    } finally {
      setSending(false)
    }
  }

  const handleEdit = (message) => {
    setEditingId(message.id)
    setEditingText(message.message_text || '')
  }

  const handleSaveEdit = async (message) => {
    if (!editingText.trim()) return
    try {
      await updateDoc(doc(messagesRef, message.id), {
        message_text: editingText.trim(),
        edited: true,
      })
      setEditingId(null)
      setEditingText('')
    } catch (err) {
      setError('Unable to edit message.')
    }
  }

  const handleDelete = async (message) => {
    try {
      await updateDoc(doc(messagesRef, message.id), {
        message_text: '',
        deleted: true,
      })
    } catch (err) {
      setError('Unable to delete message.')
    }
  }

  const handleReaction = async (message, emoji) => {
    const reactions = message.reactions || {}
    const current = new Set(reactions[emoji] || [])
    if (current.has(user.uid)) {
      current.delete(user.uid)
    } else {
      current.add(user.uid)
    }
    try {
      await updateDoc(doc(messagesRef, message.id), {
        reactions: {
          ...reactions,
          [emoji]: Array.from(current),
        },
      })
    } catch (err) {
      setError('Unable to add reaction.')
    }
  }

  const handleReport = async (message) => {
    try {
      await addDoc(collection(db, COLLECTIONS.REPORTS), {
        type: 'chat_message',
        court_id: courtId,
        target_id: message.id,
        reported_by: user.uid,
        created_at: serverTimestamp(),
      })
      setError('Thanks for the report. We will review it soon.')
    } catch (err) {
      setError('Unable to submit report.')
    }
  }

  const handleTyping = (value) => {
    setInput(value)
    if (!user) return
    setDoc(
      doc(typingRef, user.uid),
      {
        is_typing: true,
        updated_at: serverTimestamp(),
        user_id: user.uid,
        user_name: profile?.name || user.displayName || 'Hooper',
        user_photo: profile?.photo_url || '',
      },
      { merge: true }
    ).catch(() => {})

    if (typingTimeoutRef.current) {
      clearTimeout(typingTimeoutRef.current)
    }
    typingTimeoutRef.current = setTimeout(() => {
      setDoc(
        doc(typingRef, user.uid),
        { is_typing: false, updated_at: serverTimestamp() },
        { merge: true }
      ).catch(() => {})
    }, TYPING_IDLE_MS)
  }

  const handleKeyDown = (event) => {
    if (event.key === 'Enter' && !event.shiftKey) {
      event.preventDefault()
      handleSend()
    }
  }

  const handleLongPress = (message) => {
    const timer = setTimeout(() => handleReport(message), REPORT_HOLD_MS)
    const clear = () => clearTimeout(timer)
    return { onTouchEnd: clear, onTouchMove: clear, onTouchCancel: clear }
  }

  return (
    <div className="mt-6 rounded-2xl border border-slate-800 bg-slate-950/60 p-4">
      <div className="flex items-center justify-between">
        <p className="text-xs uppercase tracking-wide text-slate-400">Court Chat</p>
        <p className="text-xs text-slate-500">{presenceUsers.length} people in this chat</p>
      </div>

      <div className="mt-3 flex items-center gap-2">
        {presenceUsers.slice(0, 6).map((member) => (
          <div key={member.user_id} className="relative">
            <div className="h-8 w-8 overflow-hidden rounded-full border border-slate-800 bg-slate-900">
              {member.user_photo ? (
                <img src={member.user_photo} alt={member.user_name} className="h-full w-full object-cover" />
              ) : (
                <div className="flex h-full w-full items-center justify-center text-xs font-semibold text-orange-400">
                  {member.user_name?.[0] || '🏀'}
                </div>
              )}
            </div>
            {member.is_checked_in && (
              <span className="absolute -bottom-0.5 -right-0.5 h-3 w-3 rounded-full border border-slate-950 bg-emerald-500" />
            )}
          </div>
        ))}
      </div>

      <div className="mt-4 rounded-xl border border-slate-800 bg-slate-950/80 p-3 text-xs text-slate-400">
        Be respectful, no spam, no harassment.{' '}
        <a className="text-orange-300 underline" href="#" rel="noreferrer">
          Community guidelines
        </a>
      </div>

      {pinnedMessages.length > 0 && (
        <div className="mt-4 space-y-2">
          {pinnedMessages.map((message) => (
            <div key={message.id} className="rounded-xl border border-amber-500/40 bg-amber-500/10 p-3 text-xs text-amber-200">
              📌 {message.message_text || 'Pinned message'}
            </div>
          ))}
        </div>
      )}

      <div ref={listRef} className="mt-4 max-h-72 space-y-3 overflow-y-auto pr-1">
        {loading ? (
          <div className="space-y-3 animate-pulse">
            <div className="h-12 rounded-2xl bg-slate-800/60" />
            <div className="h-12 rounded-2xl bg-slate-800/60" />
          </div>
        ) : (
          <>
            {hasMore && (
              <button
                type="button"
                className="w-full rounded-xl border border-slate-800 px-3 py-2 text-xs text-slate-300"
                onClick={handleLoadOlder}
              >
                Load older messages
              </button>
            )}
            {messages.map((message) => {
              const isOwner = message.user_id === user?.uid
              const timestamp = message.timestamp?.toDate?.()
              const canEditDelete =
                isOwner && timestamp && Date.now() - timestamp.getTime() <= EDIT_WINDOW_MS

              return (
                <div
                  key={message.id}
                  className="flex items-start gap-3"
                  onContextMenu={(event) => {
                    event.preventDefault()
                    handleReport(message)
                  }}
                  {...handleLongPress(message)}
                >
                  <div className="h-9 w-9 overflow-hidden rounded-full border border-slate-800 bg-slate-900">
                    {message.user_photo ? (
                      <img src={message.user_photo} alt={message.user_name} className="h-full w-full object-cover" />
                    ) : (
                      <div className="flex h-full w-full items-center justify-center text-xs font-semibold text-orange-400">
                        {message.user_name?.[0] || '🏀'}
                      </div>
                    )}
                  </div>
                  <div className="flex-1">
                    <div className="flex items-center gap-2">
                      <p className="text-xs font-semibold text-slate-200">{message.user_name}</p>
                      <p className="text-[10px] text-slate-500">{formatTimeAgo(message.timestamp)}</p>
                      {message.edited && !message.deleted && (
                        <span className="text-[10px] text-slate-500">edited</span>
                      )}
                    </div>
                    {editingId === message.id ? (
                      <div className="mt-2 space-y-2">
                        <textarea
                          className="w-full rounded-xl border border-slate-800 bg-slate-950/60 px-3 py-2 text-xs text-slate-100"
                          rows={2}
                          value={editingText}
                          onChange={(event) => setEditingText(event.target.value)}
                        />
                        <div className="flex gap-2">
                          <button
                            type="button"
                            className="rounded-xl bg-orange-500 px-3 py-1 text-xs font-semibold text-slate-950"
                            onClick={() => handleSaveEdit(message)}
                          >
                            Save
                          </button>
                          <button
                            type="button"
                            className="rounded-xl border border-slate-700 px-3 py-1 text-xs text-slate-200"
                            onClick={() => setEditingId(null)}
                          >
                            Cancel
                          </button>
                        </div>
                      </div>
                    ) : (
                      <p className="mt-1 text-sm text-slate-100">
                        {message.deleted ? 'Message deleted.' : message.message_text}
                      </p>
                    )}
                    {!message.deleted && (
                      <div className="mt-2 flex flex-wrap gap-2 text-xs text-slate-400">
                        {['👍', '🔥', '⛹️'].map((emoji) => (
                          <button
                            key={emoji}
                            type="button"
                            className="rounded-full border border-slate-800 px-2 py-1"
                            onClick={() => handleReaction(message, emoji)}
                          >
                            {emoji} {message.reactions?.[emoji]?.length || 0}
                          </button>
                        ))}
                        {(canEditDelete || isModerator) && (
                          <>
                            {canEditDelete && (
                              <button
                                type="button"
                                className="rounded-full border border-slate-800 px-2 py-1"
                                onClick={() => handleEdit(message)}
                              >
                                Edit
                              </button>
                            )}
                            <button
                              type="button"
                              className="rounded-full border border-slate-800 px-2 py-1"
                              onClick={() => handleDelete(message)}
                            >
                              Delete
                            </button>
                          </>
                        )}
                        {isModerator && (
                          <button
                            type="button"
                            className="rounded-full border border-slate-800 px-2 py-1"
                            onClick={() => updateDoc(doc(messagesRef, message.id), { pinned: true })}
                          >
                            Pin
                          </button>
                        )}
                      </div>
                    )}
                  </div>
                </div>
              )
            })}
          </>
        )}
      </div>

      {typingUsers.length > 0 && (
        <p className="mt-3 text-xs text-slate-400">
          {typingUsers.map((u) => u.user_name).join(', ')} typing...
        </p>
      )}

      {error && (
        <div className="mt-3 rounded-xl border border-orange-500/40 bg-orange-500/10 px-3 py-2 text-xs text-orange-200">
          {error}
        </div>
      )}

      <div className="mt-4">
        <textarea
          className="h-20 w-full rounded-xl border border-slate-800 bg-slate-950/60 px-3 py-2 text-sm text-slate-100 outline-none transition focus:border-orange-500"
          placeholder={`Message ${courtName}`}
          value={input}
          maxLength={500}
          onChange={(event) => handleTyping(event.target.value)}
          onKeyDown={handleKeyDown}
        />
        <div className="mt-2 flex items-center justify-between text-xs text-slate-400">
          <span>{input.length}/500</span>
          <button
            type="button"
            className="rounded-xl bg-orange-500 px-4 py-2 text-xs font-semibold text-slate-950"
            onClick={handleSend}
            disabled={!canSend || sending}
          >
            {sending ? 'Sending...' : 'Send'}
          </button>
        </div>
      </div>
    </div>
  )
}

export default CourtChatSection
