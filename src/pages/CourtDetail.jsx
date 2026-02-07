import { useEffect, useMemo, useRef, useState } from 'react'
import { useNavigate, useParams } from 'react-router-dom'
import courts from '../data/courts.js'
import { useAuth } from '../context/AuthContext.jsx'
import {
  addDoc,
  collection,
  doc,
  getDoc,
  limit,
  onSnapshot,
  orderBy,
  query,
  runTransaction,
  serverTimestamp,
  updateDoc,
  where,
} from 'firebase/firestore'
import { db } from '../firebase.js'
import { logAnalyticsEvent } from '../utils/analytics.js'

function CourtDetail({ courtId, onClose, variant = 'page' }) {
  const navigate = useNavigate()
  const { id } = useParams()
  const { user, profile } = useAuth()
  const [checkIns, setCheckIns] = useState([])
  const [checkInsLoaded, setCheckInsLoaded] = useState(false)
  const [queueEntries, setQueueEntries] = useState([])
  const [calledEntries, setCalledEntries] = useState([])
  const [queueHistory, setQueueHistory] = useState([])
  const [playerRequests, setPlayerRequests] = useState([])
  const [profilesById, setProfilesById] = useState({})
  const [submitting, setSubmitting] = useState(false)
  const [requestSubmitting, setRequestSubmitting] = useState(false)
  const [now, setNow] = useState(Date.now())
  const [checkInsLoading, setCheckInsLoading] = useState(true)
  const [queueLoading, setQueueLoading] = useState(true)
  const [requestsLoading, setRequestsLoading] = useState(true)
  const [pageError, setPageError] = useState('')
  const [actionError, setActionError] = useState('')
  const [refreshing, setRefreshing] = useState(false)
  const [refreshKey, setRefreshKey] = useState(0)
  const containerRef = useRef(null)
  const touchStartY = useRef(null)
  const [requestForm, setRequestForm] = useState({
    players_needed: '',
    skill_level_pref: '',
    time: 'Now',
  })

  const activeCourtId = courtId || id
  const isSheet = variant === 'sheet'
  const isPanel = variant === 'panel'
  const court = useMemo(
    () => courts.find((item) => item.id === activeCourtId),
    [activeCourtId]
  )
  const activeCheckIn = useMemo(
    () => checkIns.find((entry) => entry.user_id === user?.uid),
    [checkIns, user?.uid]
  )
  const currentQueueEntry = useMemo(
    () => queueEntries.find((entry) => entry.user_id === user?.uid),
    [queueEntries, user?.uid]
  )
  const currentCalledEntry = useMemo(
    () => calledEntries.find((entry) => entry.user_id === user?.uid),
    [calledEntries, user?.uid]
  )
  const currentQueueIndex = useMemo(() => {
    if (!currentQueueEntry) return -1
    return queueEntries.findIndex((entry) => entry.id === currentQueueEntry.id)
  }, [currentQueueEntry, queueEntries])

  useEffect(() => {
    if (!court) return
    const activeQuery = query(
      collection(db, 'checkIns'),
      where('court_id', '==', court.id),
      where('status', '==', 'active')
    )

    const expireThresholdMs = 2.5 * 60 * 60 * 1000

    setCheckInsLoading(true)
    const unsubscribe = onSnapshot(
      activeQuery,
      (snapshot) => {
        const now = Date.now()
        const entries = snapshot.docs
          .map((docSnap) => ({
            id: docSnap.id,
            ...docSnap.data(),
          }))
          .filter((entry) => {
            if (!entry.check_in_time?.toDate) return true
            const ageMs = now - entry.check_in_time.toDate().getTime()
            if (ageMs >= expireThresholdMs) {
              updateDoc(doc(db, 'checkIns', entry.id), {
                status: 'expired',
              })
              return false
            }
            return true
          })

        setCheckIns(entries)
        setCheckInsLoaded(true)
        setCheckInsLoading(false)
      },
      (error) => {
        console.error('Check-in listener error', error)
        setPageError('Unable to load check-ins. Please try again.')
        setCheckInsLoading(false)
      }
    )

    return unsubscribe
  }, [court, refreshKey])

  useEffect(() => {
    if (!court) return
    const requestQuery = query(
      collection(db, 'playerRequests'),
      where('court_id', '==', court.id),
      where('status', '==', 'open'),
      orderBy('created_at', 'desc')
    )
    const expireThresholdMs = 60 * 60 * 1000

    setRequestsLoading(true)
    const unsubscribe = onSnapshot(
      requestQuery,
      (snapshot) => {
        const now = Date.now()
        const entries = snapshot.docs
          .map((docSnap) => ({
            id: docSnap.id,
            ...docSnap.data(),
          }))
          .filter((entry) => {
            if (!entry.created_at?.toDate) return true
            const ageMs = now - entry.created_at.toDate().getTime()
            if (ageMs >= expireThresholdMs) {
              updateDoc(doc(db, 'playerRequests', entry.id), {
                status: 'expired',
              })
              return false
            }
            return true
          })
        setPlayerRequests(entries)
        setRequestsLoading(false)
      },
      (error) => {
        console.error('Player request listener error', error)
        setPageError('Unable to load player requests.')
        setRequestsLoading(false)
      }
    )

    return unsubscribe
  }, [court, refreshKey])

  useEffect(() => {
    if (!court) return
    const queueQuery = query(
      collection(db, 'queues'),
      where('court_id', '==', court.id),
      where('status', '==', 'waiting'),
      orderBy('position', 'asc')
    )

    setQueueLoading(true)
    const unsubscribe = onSnapshot(
      queueQuery,
      (snapshot) => {
        const entries = snapshot.docs.map((docSnap) => ({
          id: docSnap.id,
          ...docSnap.data(),
        }))
        setQueueEntries(entries)
        setQueueLoading(false)
      },
      (error) => {
        console.error('Queue listener error', error)
        setPageError('Unable to load the queue. Please try again.')
        setQueueLoading(false)
      }
    )

    return unsubscribe
  }, [court, refreshKey])

  useEffect(() => {
    if (!court) return
    const calledQuery = query(
      collection(db, 'queues'),
      where('court_id', '==', court.id),
      where('status', '==', 'called'),
      orderBy('called_at', 'asc')
    )

    const unsubscribe = onSnapshot(
      calledQuery,
      (snapshot) => {
        const entries = snapshot.docs.map((docSnap) => ({
          id: docSnap.id,
          ...docSnap.data(),
        }))
        setCalledEntries(entries)
      },
      (error) => {
        console.error('Called queue listener error', error)
        setPageError('Unable to load called players.')
      }
    )

    return unsubscribe
  }, [court, refreshKey])

  useEffect(() => {
    if (!court) return
    const historyQuery = query(
      collection(db, 'queues'),
      where('court_id', '==', court.id),
      orderBy('called_at', 'desc'),
      limit(5)
    )

    const unsubscribe = onSnapshot(
      historyQuery,
      (snapshot) => {
        const entries = snapshot.docs
          .map((docSnap) => ({
            id: docSnap.id,
            ...docSnap.data(),
          }))
          .filter((entry) => entry.called_at && entry.status !== 'waiting')
          .slice(0, 3)
        setQueueHistory(entries)
      },
      (error) => {
        console.error('Queue history listener error', error)
      }
    )

    return unsubscribe
  }, [court, refreshKey])

  useEffect(() => {
    if (!checkInsLoaded || !user) return
    if (activeCheckIn || (!currentQueueEntry && !currentCalledEntry)) return
    const entryToRemove = currentQueueEntry || currentCalledEntry
    updateDoc(doc(db, 'queues', entryToRemove.id), {
      status: 'removed',
    })
  }, [activeCheckIn, checkInsLoaded, currentQueueEntry, currentCalledEntry, user])

  useEffect(() => {
    const missing = [
      ...checkIns,
      ...queueEntries,
      ...calledEntries,
      ...queueHistory,
      ...playerRequests.map((request) => ({ user_id: request.posted_by })),
    ]
      .map((entry) => entry.user_id)
      .filter((uid) => uid && !profilesById[uid])

    if (!missing.length) return

    const loadProfiles = async () => {
      const results = await Promise.all(
        missing.map(async (uid) => {
          const snap = await getDoc(doc(db, 'users', uid))
          return { uid, data: snap.exists() ? snap.data() : null }
        })
      )
      setProfilesById((prev) => {
        const next = { ...prev }
        results.forEach((result) => {
          next[result.uid] = result.data
        })
        return next
      })
    }

    loadProfiles()
  }, [checkIns, queueEntries, calledEntries, queueHistory, playerRequests, profilesById])

  useEffect(() => {
    if (!queueEntries.length && !activeCheckIn && !playerRequests.length) return
    const interval = setInterval(() => setNow(Date.now()), 60000)
    return () => clearInterval(interval)
  }, [queueEntries.length, activeCheckIn, playerRequests.length])

  useEffect(() => {
    if (!calledEntries.length) return
    const interval = setInterval(() => setNow(Date.now()), 60000)
    return () => clearInterval(interval)
  }, [calledEntries.length])

  const triggerRefresh = () => {
    setRefreshing(true)
    setPageError('')
    setActionError('')
    setRefreshKey((prev) => prev + 1)
    setTimeout(() => setRefreshing(false), 600)
  }

  const handleTouchStart = (event) => {
    if (!containerRef.current) return
    if (containerRef.current.scrollTop > 0) return
    touchStartY.current = event.touches[0].clientY
  }

  const handleTouchEnd = (event) => {
    if (!containerRef.current) return
    if (touchStartY.current === null) return
    const deltaY = event.changedTouches[0].clientY - touchStartY.current
    touchStartY.current = null
    if (deltaY > 80 && containerRef.current.scrollTop <= 0) {
      triggerRefresh()
    }
  }

  const handleCheckIn = async () => {
    if (!user || !court) return
    setSubmitting(true)
    setActionError('')
    try {
      await addDoc(collection(db, 'checkIns'), {
        user_id: user.uid,
        court_id: court.id,
        check_in_time: serverTimestamp(),
        status: 'active',
        looking_for_team: false,
      })
      await logAnalyticsEvent(user.uid, 'check_in_created', {
        court_id: court.id,
      })
    } catch (error) {
      setActionError('Unable to check in. Please try again.')
    } finally {
      setSubmitting(false)
    }
  }

  const handleCheckOut = async () => {
    if (!activeCheckIn) return
    setSubmitting(true)
    setActionError('')
    try {
      await updateDoc(doc(db, 'checkIns', activeCheckIn.id), {
        status: 'ended',
        check_out_time: serverTimestamp(),
      })
      if (currentQueueEntry) {
        await updateDoc(doc(db, 'queues', currentQueueEntry.id), {
          status: 'removed',
        })
      }
      if (currentCalledEntry) {
        await updateDoc(doc(db, 'queues', currentCalledEntry.id), {
          status: 'removed',
        })
      }
    } catch (error) {
      setActionError('Unable to check out. Please try again.')
    } finally {
      setSubmitting(false)
    }
  }

  const handleExtend = async () => {
    if (!activeCheckIn) return
    setSubmitting(true)
    setActionError('')
    try {
      await updateDoc(doc(db, 'checkIns', activeCheckIn.id), {
        check_in_time: serverTimestamp(),
      })
    } catch (error) {
      setActionError('Unable to extend check-in.')
    } finally {
      setSubmitting(false)
    }
  }

  const handleLookingForTeamToggle = async () => {
    if (!activeCheckIn) return
    setSubmitting(true)
    setActionError('')
    try {
      await updateDoc(doc(db, 'checkIns', activeCheckIn.id), {
        looking_for_team: !activeCheckIn.looking_for_team,
      })
    } catch (error) {
      setActionError('Unable to update status.')
    } finally {
      setSubmitting(false)
    }
  }

  const handleJoinQueue = async () => {
    if (!user || !court || !activeCheckIn || currentQueueEntry) return
    setSubmitting(true)
    setActionError('')
    try {
      const position = queueEntries.length + 1
      await addDoc(collection(db, 'queues'), {
        court_id: court.id,
        user_id: user.uid,
        position,
        joined_at: serverTimestamp(),
        status: 'waiting',
      })
      await logAnalyticsEvent(user.uid, 'queue_joined', {
        court_id: court.id,
      })
    } catch (error) {
      setActionError('Unable to join the queue.')
    } finally {
      setSubmitting(false)
    }
  }

  const handleLeaveQueue = async () => {
    if (!currentQueueEntry && !currentCalledEntry) return
    setSubmitting(true)
    setActionError('')
    try {
      const entry = currentQueueEntry || currentCalledEntry
      await updateDoc(doc(db, 'queues', entry.id), {
        status: 'removed',
      })
    } catch (error) {
      setActionError('Unable to leave the queue.')
    } finally {
      setSubmitting(false)
    }
  }

  const handleCallNext = async () => {
    if (!court) return
    setSubmitting(true)
    setActionError('')
    try {
      await runTransaction(db, async (transaction) => {
        const calledQuery = query(
          collection(db, 'queues'),
          where('court_id', '==', court.id),
          where('status', '==', 'called'),
          limit(1)
        )
        const calledSnapshot = await transaction.get(calledQuery)
        if (!calledSnapshot.empty) return

        const waitingQuery = query(
          collection(db, 'queues'),
          where('court_id', '==', court.id),
          where('status', '==', 'waiting'),
          orderBy('position', 'asc'),
          limit(1)
        )
        const waitingSnapshot = await transaction.get(waitingQuery)
        if (waitingSnapshot.empty) return

        const target = waitingSnapshot.docs[0]
        transaction.update(target.ref, {
          status: 'called',
          called_at: serverTimestamp(),
        })
      })
    } catch (error) {
      setActionError('Unable to call next player.')
    } finally {
      setSubmitting(false)
    }
  }

  const handleConfirmPlaying = async () => {
    if (!currentCalledEntry) return
    setSubmitting(true)
    setActionError('')
    try {
      await updateDoc(doc(db, 'queues', currentCalledEntry.id), {
        status: 'confirmed',
        confirmed_at: serverTimestamp(),
      })
    } catch (error) {
      setActionError('Unable to confirm. Please try again.')
    } finally {
      setSubmitting(false)
    }
  }

  const handleRequestChange = (event) => {
    const { name, value } = event.target
    setRequestForm((prev) => ({ ...prev, [name]: value }))
  }

  const handleSubmitRequest = async (event) => {
    event.preventDefault()
    if (!user || !court || !activeCheckIn) return
    setRequestSubmitting(true)
    setActionError('')
    try {
      await addDoc(collection(db, 'playerRequests'), {
        court_id: court.id,
        posted_by: user.uid,
        players_needed: Number(requestForm.players_needed),
        skill_level_pref: requestForm.skill_level_pref,
        time: requestForm.time,
        status: 'open',
        created_at: serverTimestamp(),
      })
      await logAnalyticsEvent(user.uid, 'player_request_posted', {
        court_id: court.id,
        players_needed: Number(requestForm.players_needed),
      })
      setRequestForm((prev) => ({
        ...prev,
        players_needed: '',
        skill_level_pref: '',
      }))
    } catch (error) {
      setActionError('Unable to post request.')
    } finally {
      setRequestSubmitting(false)
    }
  }

  const handleMarkRequestFilled = async (requestId) => {
    if (!requestId) return
    setRequestSubmitting(true)
    setActionError('')
    try {
      await updateDoc(doc(db, 'playerRequests', requestId), {
        status: 'filled',
      })
    } catch (error) {
      setActionError('Unable to update request.')
    } finally {
      setRequestSubmitting(false)
    }
  }

  const formatTimeAgo = (timestamp) => {
    if (!timestamp?.toDate) return 'just now'
    const now = Date.now()
    const diff = Math.max(now - timestamp.toDate().getTime(), 0)
    const minutes = Math.floor(diff / 60000)
    if (minutes < 1) return 'just now'
    if (minutes < 60) return `${minutes} min ago`
    const hours = Math.floor(minutes / 60)
    if (hours < 24) return `${hours} hour${hours === 1 ? '' : 's'} ago`
    const days = Math.floor(hours / 24)
    return `${days} day${days === 1 ? '' : 's'} ago`
  }

  const formatQueueDuration = (timestamp) => {
    if (!timestamp?.toDate) return 'waiting now'
    const diff = Math.max(now - timestamp.toDate().getTime(), 0)
    const minutes = Math.floor(diff / 60000)
    if (minutes < 1) return 'waiting now'
    if (minutes < 60) return `waiting ${minutes} min`
    const hours = Math.floor(minutes / 60)
    return `waiting ${hours} hr`
  }

  const formatRequestAge = (timestamp) => {
    if (!timestamp?.toDate) return 'just now'
    const diff = Math.max(now - timestamp.toDate().getTime(), 0)
    const minutes = Math.floor(diff / 60000)
    if (minutes < 1) return 'just now'
    if (minutes < 60) return `${minutes} min ago`
    const hours = Math.floor(minutes / 60)
    return `${hours} hr ago`
  }

  const calledEntryAgeMs = useMemo(() => {
    if (!currentCalledEntry?.called_at?.toDate) return 0
    return now - currentCalledEntry.called_at.toDate().getTime()
  }, [currentCalledEntry, now])

  const shouldShowCalledBanner = calledEntryAgeMs > 0 && calledEntryAgeMs < 5 * 60 * 1000

  useEffect(() => {
    if (!calledEntries.length) return
    const expirationMs = 5 * 60 * 1000
    const expired = calledEntries.find((entry) => {
      if (!entry.called_at?.toDate) return false
      return now - entry.called_at.toDate().getTime() >= expirationMs
    })
    if (!expired) return

    const expireAndCallNext = async () => {
      await updateDoc(doc(db, 'queues', expired.id), {
        status: 'removed',
      })
      await handleCallNext()
    }

    expireAndCallNext()
  }, [calledEntries, now])

  const formatPosition = (index) => {
    const position = index + 1
    if (position % 10 === 1 && position % 100 !== 11) return `${position}st`
    if (position % 10 === 2 && position % 100 !== 12) return `${position}nd`
    if (position % 10 === 3 && position % 100 !== 13) return `${position}rd`
    return `${position}th`
  }

  const activeCheckInAgeMs = useMemo(() => {
    if (!activeCheckIn?.check_in_time?.toDate) return 0
    return now - activeCheckIn.check_in_time.toDate().getTime()
  }, [activeCheckIn, now])

  const shouldShowExtend = activeCheckInAgeMs >= 2 * 60 * 60 * 1000
  const shouldShowExpiryBanner =
    activeCheckInAgeMs >= 2.25 * 60 * 60 * 1000 &&
    activeCheckInAgeMs < 2.5 * 60 * 60 * 1000

  if (!court) {
    return (
      <div className="flex flex-1 items-center justify-center px-6 py-12 text-center">
        <div className="rounded-2xl border border-slate-800 bg-slate-900/80 p-6">
          <h2 className="text-lg font-semibold">Court not found</h2>
          <p className="mt-2 text-sm text-slate-400">Try heading back to the map.</p>
          <button
            type="button"
            className="mt-4 rounded-full bg-orange-500 px-4 py-2 text-sm font-semibold text-slate-950"
            onClick={() => (onClose ? onClose() : navigate('/', { replace: true }))}
          >
            Back to Map
          </button>
        </div>
      </div>
    )
  }

  return (
    <div
      ref={containerRef}
      className={`relative flex flex-1 flex-col transition-opacity duration-300 ease-out ${
        isSheet
          ? 'max-h-[calc(85vh-3.5rem)] overflow-y-auto px-4 pb-8'
          : isPanel
          ? 'h-full px-2 pb-10'
          : 'min-h-full bg-slate-950'
      }`}
      onTouchStart={handleTouchStart}
      onTouchEnd={handleTouchEnd}
    >
      {!isSheet && (
        <div className="absolute inset-0 bg-gradient-to-b from-slate-900/80 via-slate-950 to-slate-950" />
      )}
      {refreshing && (
        <div className="absolute left-1/2 top-3 z-20 -translate-x-1/2 rounded-full border border-slate-800 bg-slate-950/90 px-3 py-1 text-xs text-slate-300 shadow-lg">
          Refreshing...
        </div>
      )}
      {(pageError || actionError) && (
        <div className="absolute left-4 right-4 top-12 z-20 rounded-2xl border border-orange-500/40 bg-orange-500/10 px-4 py-3 text-xs text-orange-200 shadow-lg">
          {pageError || actionError}
        </div>
      )}
      <div
        className={`relative flex flex-1 ${
          isSheet
            ? ''
            : isPanel
            ? ''
            : 'items-end px-4 pb-6 pt-8 sm:items-start sm:justify-center sm:pt-10'
        }`}
      >
        <div
          className={`w-full max-w-xl ${
            isSheet
              ? 'mx-auto'
              : isPanel
              ? 'mx-auto rounded-3xl border border-slate-800 bg-slate-900/90 p-6 shadow-xl'
              : 'rounded-t-3xl border border-slate-800 bg-slate-900/90 p-6 shadow-xl backdrop-blur sm:rounded-2xl'
          }`}
        >
          <button
            type="button"
            className="inline-flex items-center gap-2 rounded-full border border-slate-700 px-4 py-2 text-sm font-semibold text-slate-100 transition hover:border-orange-400 hover:text-orange-300"
            onClick={() => (onClose ? onClose() : navigate(-1))}
          >
            ← {isSheet ? 'Close' : 'Back to Map'}
          </button>

          <div className="mt-5 space-y-2">
            <h1 className="text-2xl font-semibold text-slate-50">{court.name}</h1>
            <p className="text-sm text-slate-400">{court.address}</p>
          </div>

          <div className="mt-6 grid gap-3 sm:grid-cols-3">
            <div className="rounded-2xl border border-slate-800 bg-slate-950/60 p-4">
              <p className="text-xs uppercase tracking-wide text-slate-400">Type</p>
              <p className="mt-2 text-base font-semibold text-slate-100">
                {court.outdoor ? 'Outdoor' : 'Indoor'}
              </p>
            </div>
            <div className="rounded-2xl border border-slate-800 bg-slate-950/60 p-4">
              <p className="text-xs uppercase tracking-wide text-slate-400">Hoops</p>
              <p className="mt-2 text-base font-semibold text-slate-100">
                {court.num_hoops} hoops
              </p>
            </div>
            <div className="rounded-2xl border border-slate-800 bg-slate-950/60 p-4">
              <p className="text-xs uppercase tracking-wide text-slate-400">Lights</p>
              <p className="mt-2 text-base font-semibold text-slate-100">
                {court.has_lights ? 'Lights available' : 'No lights'}
              </p>
            </div>
          </div>

          <div className="mt-6 rounded-2xl border border-slate-800 bg-slate-950/60 p-4">
            <p className="text-xs uppercase tracking-wide text-slate-400">Court info</p>
            <ul className="mt-3 space-y-2 text-sm text-slate-200">
              <li>Outdoor</li>
              <li>2 hoops</li>
              <li>Lights available</li>
            </ul>
          </div>

          <div className="mt-6 rounded-2xl border border-slate-800 bg-slate-950/60 p-4">
            <p className="text-xs uppercase tracking-wide text-slate-400">Check-in</p>
            <div className="mt-3">
              {activeCheckIn ? (
                <div className="space-y-3">
                  {shouldShowExpiryBanner && (
                    <div className="rounded-xl border border-orange-500/40 bg-orange-500/10 px-4 py-3 text-xs text-orange-200">
                      Your check-in expires in about 15 minutes.
                    </div>
                  )}
                  {currentCalledEntry && shouldShowCalledBanner && (
                    <div className="rounded-xl border border-blue-500/40 bg-blue-500/10 px-4 py-3 text-xs text-blue-200">
                      You&apos;re up! Head to the court.
                    </div>
                  )}
                  <div className="rounded-xl border border-emerald-500/40 bg-emerald-500/10 px-4 py-3 text-sm text-emerald-200">
                    You&apos;re checked in.
                  </div>
                  {currentCalledEntry && (
                    <button
                      type="button"
                      className="w-full rounded-xl bg-blue-500 px-4 py-3 text-sm font-semibold text-slate-950 transition hover:bg-blue-400"
                      onClick={handleConfirmPlaying}
                      disabled={submitting}
                    >
                      {submitting ? 'Confirming...' : "Confirm - I'm Playing"}
                    </button>
                  )}
                  {shouldShowExtend && (
                    <button
                      type="button"
                      className="w-full rounded-xl bg-orange-500 px-4 py-3 text-sm font-semibold text-slate-950 transition hover:bg-orange-400"
                      onClick={handleExtend}
                      disabled={submitting}
                    >
                      {submitting ? 'Extending...' : 'Extend Check-In'}
                    </button>
                  )}
                  <button
                    type="button"
                    className="w-full rounded-xl border border-slate-700 px-4 py-3 text-sm font-semibold text-slate-100 transition hover:border-orange-400 hover:text-orange-300"
                    onClick={handleCheckOut}
                    disabled={submitting}
                  >
                    {submitting ? 'Checking out...' : 'Check Out'}
                  </button>
                  <button
                    type="button"
                    className="w-full rounded-xl border border-slate-800 bg-slate-950/60 px-4 py-3 text-sm font-semibold text-slate-100 transition hover:border-orange-400 hover:text-orange-300"
                    onClick={handleLookingForTeamToggle}
                    disabled={submitting}
                  >
                    {activeCheckIn.looking_for_team
                      ? 'Looking for players: On'
                      : 'Looking for players: Off'}
                  </button>
                </div>
              ) : (
                <button
                  type="button"
                  className="w-full rounded-xl bg-orange-500 px-4 py-3 text-sm font-semibold text-slate-950 transition hover:bg-orange-400"
                  onClick={handleCheckIn}
                  disabled={submitting}
                >
                  {submitting ? 'Checking in...' : 'Check In Here'}
                </button>
              )}
            </div>
          </div>

          <div className="mt-6">
            <div className="flex items-center justify-between">
              <p className="text-xs uppercase tracking-wide text-slate-400">Currently here</p>
              <p className="text-xs text-slate-500">{checkIns.length} player(s)</p>
            </div>
            <div className="mt-3 space-y-3">
              {checkInsLoading ? (
                <div className="space-y-3 animate-pulse">
                  <div className="h-16 rounded-2xl bg-slate-800/60" />
                  <div className="h-16 rounded-2xl bg-slate-800/60" />
                </div>
              ) : checkIns.length === 0 ? (
                <div className="rounded-2xl border border-dashed border-slate-800 bg-slate-950/40 p-4 text-sm text-slate-400">
                  No one has checked in yet.
                </div>
              ) : (
                checkIns.map((entry) => {
                  const entryProfile =
                    profilesById[entry.user_id] ||
                    (entry.user_id === user?.uid ? profile : null)
                  const displayName =
                    entryProfile?.name || entryProfile?.displayName || 'Hooper'
                  const skillLevel = entryProfile?.skill_level || 'Not set'

                  return (
                    <div
                      key={entry.id}
                      className="flex items-center gap-3 rounded-2xl border border-slate-800 bg-slate-950/60 p-3"
                    >
                      <div className="h-12 w-12 overflow-hidden rounded-full border border-slate-800 bg-slate-900">
                        {entryProfile?.photo_url ? (
                          <img
                            src={entryProfile.photo_url}
                            alt={displayName}
                            className="h-full w-full object-cover"
                          />
                        ) : (
                          <div className="flex h-full w-full items-center justify-center text-sm font-semibold text-orange-400">
                            {displayName[0]}
                          </div>
                        )}
                      </div>
                      <div className="flex-1">
                        <p className="text-sm font-semibold text-slate-100">{displayName}</p>
                        <div className="flex flex-wrap items-center gap-2">
                          <p className="text-xs text-slate-400">{skillLevel}</p>
                          {entry.looking_for_team && (
                            <span className="rounded-full bg-blue-500/20 px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wide text-blue-300">
                              Looking for players
                            </span>
                          )}
                        </div>
                      </div>
                      <p className="text-xs text-slate-500">
                        {formatTimeAgo(entry.check_in_time)}
                      </p>
                    </div>
                  )
                })
              )}
            </div>
          </div>

          <div className="mt-6">
            <div className="flex items-center justify-between">
              <p className="text-xs uppercase tracking-wide text-slate-400">Who has next</p>
              <p className="text-xs text-slate-500">{queueEntries.length} waiting</p>
            </div>

            <div className="mt-3 space-y-3">
              {queueLoading ? (
                <div className="space-y-3 animate-pulse">
                  <div className="h-14 rounded-2xl bg-slate-800/60" />
                  <div className="h-14 rounded-2xl bg-slate-800/60" />
                </div>
              ) : queueEntries.length === 0 ? (
                <div className="rounded-2xl border border-dashed border-slate-800 bg-slate-950/40 p-4 text-sm text-slate-400">
                  The queue is empty.
                </div>
              ) : (
                queueEntries.map((entry, index) => {
                  const entryProfile =
                    profilesById[entry.user_id] ||
                    (entry.user_id === user?.uid ? profile : null)
                  const displayName =
                    entryProfile?.name || entryProfile?.displayName || 'Hooper'
                  const badgeLabel = index === 0 ? 'Next Up' : index === 1 ? 'On Deck' : null

                  return (
                    <div
                      key={entry.id}
                      className="flex items-center gap-3 rounded-2xl border border-slate-800 bg-slate-950/60 p-3"
                    >
                      <div className="flex h-10 w-10 items-center justify-center rounded-full border border-slate-800 bg-slate-900 text-xs font-semibold text-slate-200">
                        {formatPosition(index)}
                      </div>
                      <div className="h-10 w-10 overflow-hidden rounded-full border border-slate-800 bg-slate-900">
                        {entryProfile?.photo_url ? (
                          <img
                            src={entryProfile.photo_url}
                            alt={displayName}
                            className="h-full w-full object-cover"
                          />
                        ) : (
                          <div className="flex h-full w-full items-center justify-center text-xs font-semibold text-orange-400">
                            {displayName[0]}
                          </div>
                        )}
                      </div>
                      <div className="flex-1">
                        <div className="flex items-center gap-2">
                          <p className="text-sm font-semibold text-slate-100">{displayName}</p>
                          {badgeLabel && (
                            <span className="rounded-full bg-emerald-500/20 px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wide text-emerald-300">
                              {badgeLabel}
                            </span>
                          )}
                        </div>
                        <p className="text-xs text-slate-400">
                          {formatQueueDuration(entry.joined_at)}
                        </p>
                      </div>
                    </div>
                  )
                })
              )}
            </div>

            <div className="mt-4 space-y-3">
              {activeCheckIn && (
                <button
                  type="button"
                  className="w-full rounded-xl border border-slate-700 px-4 py-3 text-sm font-semibold text-slate-100 transition hover:border-orange-400 hover:text-orange-300 disabled:cursor-not-allowed disabled:border-slate-800 disabled:text-slate-500"
                  onClick={handleCallNext}
                  disabled={submitting || queueEntries.length === 0 || calledEntries.length > 0}
                >
                  {queueEntries.length === 0
                    ? 'Queue is empty'
                    : calledEntries.length > 0
                    ? 'Next player already called'
                    : 'Call Next'}
                </button>
              )}
              {currentQueueEntry ? (
                <div className="rounded-2xl border border-emerald-500/40 bg-emerald-500/10 px-4 py-3 text-sm text-emerald-200">
                  You&apos;re {currentQueueIndex >= 0 ? formatPosition(currentQueueIndex) : 'in line'}.
                </div>
              ) : (
                <button
                  type="button"
                  className="w-full rounded-xl bg-orange-500 px-4 py-3 text-sm font-semibold text-slate-950 transition hover:bg-orange-400 disabled:cursor-not-allowed disabled:bg-slate-700 disabled:text-slate-300"
                  onClick={handleJoinQueue}
                  disabled={!activeCheckIn || submitting || currentCalledEntry}
                >
                  {activeCheckIn ? 'Join Queue' : 'Check in to join'}
                </button>
              )}

              {(currentQueueEntry || currentCalledEntry) && (
                <button
                  type="button"
                  className="w-full rounded-xl border border-slate-700 px-4 py-3 text-sm font-semibold text-slate-100 transition hover:border-orange-400 hover:text-orange-300"
                  onClick={handleLeaveQueue}
                  disabled={submitting}
                >
                  {submitting ? 'Leaving...' : 'Leave Queue'}
                </button>
              )}
            </div>
          </div>

          <div className="mt-6 rounded-2xl border border-slate-800 bg-slate-950/60 p-4">
            <div className="flex items-center justify-between">
              <p className="text-xs uppercase tracking-wide text-slate-400">Need players</p>
              <p className="text-xs text-slate-500">{playerRequests.length} open</p>
            </div>

            {!activeCheckIn && (
              <div className="mt-3 rounded-2xl border border-slate-800 bg-slate-950/40 p-3 text-xs text-slate-400">
                Check in to post a player request.
              </div>
            )}
            <form className="mt-4 space-y-3" onSubmit={handleSubmitRequest}>
              <div className="grid gap-3 sm:grid-cols-2">
                <label className="text-xs text-slate-300">
                  Players needed
                  <input
                    type="number"
                    min="1"
                    name="players_needed"
                    value={requestForm.players_needed}
                    onChange={handleRequestChange}
                    className="mt-2 w-full rounded-xl border border-slate-800 bg-slate-950/60 px-3 py-2 text-sm text-slate-100 outline-none transition focus:border-orange-500"
                    placeholder="2"
                    required
                  />
                </label>
                <label className="text-xs text-slate-300">
                  Skill preference
                  <select
                    name="skill_level_pref"
                    value={requestForm.skill_level_pref}
                    onChange={handleRequestChange}
                    className="mt-2 w-full rounded-xl border border-slate-800 bg-slate-950/60 px-3 py-2 text-sm text-slate-100 outline-none transition focus:border-orange-500"
                  >
                    <option value="">Any</option>
                    <option value="Beginner">Beginner</option>
                    <option value="Intermediate">Intermediate</option>
                    <option value="Advanced">Advanced</option>
                  </select>
                </label>
              </div>
              <label className="text-xs text-slate-300">
                Time
                <select
                  name="time"
                  value={requestForm.time}
                  onChange={handleRequestChange}
                  className="mt-2 w-full rounded-xl border border-slate-800 bg-slate-950/60 px-3 py-2 text-sm text-slate-100 outline-none transition focus:border-orange-500"
                >
                  <option value="Now">Now</option>
                  <option value="15 min">15 min</option>
                  <option value="30 min">30 min</option>
                  <option value="1 hour">1 hour</option>
                </select>
              </label>
              <button
                type="submit"
                className="w-full rounded-xl bg-orange-500 px-4 py-3 text-sm font-semibold text-slate-950 transition hover:bg-orange-400 disabled:cursor-not-allowed disabled:bg-slate-700 disabled:text-slate-300"
                disabled={requestSubmitting || !activeCheckIn}
              >
                {requestSubmitting ? 'Posting...' : 'Post Request'}
              </button>
            </form>

            <div className="mt-4 space-y-3">
              {requestsLoading ? (
                <div className="space-y-3 animate-pulse">
                  <div className="h-20 rounded-2xl bg-slate-800/60" />
                  <div className="h-20 rounded-2xl bg-slate-800/60" />
                </div>
              ) : playerRequests.length === 0 ? (
                <div className="rounded-2xl border border-dashed border-slate-800 bg-slate-950/40 p-4 text-sm text-slate-400">
                  No active requests yet.
                </div>
              ) : (
                playerRequests.map((request) => {
                  const requestProfile =
                    profilesById[request.posted_by] ||
                    (request.posted_by === user?.uid ? profile : null)
                  const displayName =
                    requestProfile?.name || requestProfile?.displayName || 'Hooper'
                  const contactEmail = requestProfile?.email || user?.email || ''

                  return (
                    <div
                      key={request.id}
                      className="rounded-2xl border border-slate-800 bg-slate-950/60 p-4"
                    >
                      <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
                        <div>
                          <p className="text-sm font-semibold text-slate-100">
                            Need {request.players_needed} player(s)
                          </p>
                          <p className="text-xs text-slate-400">
                            Skill: {request.skill_level_pref || 'Any'} · Time: {request.time}
                          </p>
                          <p className="mt-2 text-xs text-slate-500">
                            Posted by {displayName} · {formatRequestAge(request.created_at)}
                          </p>
                          {contactEmail && (
                            <p className="mt-1 text-xs text-slate-400">Contact: {contactEmail}</p>
                          )}
                        </div>
                        <div className="flex flex-col gap-2">
                          {contactEmail && (
                            <a
                              href={`mailto:${contactEmail}?subject=RunIt%20Pittsburgh%20Run%20at%20${encodeURIComponent(
                                court.name
                              )}`}
                              className="rounded-xl bg-blue-500 px-3 py-2 text-center text-xs font-semibold text-slate-950 transition hover:bg-blue-400"
                            >
                              Join This Run
                            </a>
                          )}
                          {request.posted_by === user?.uid && (
                            <button
                              type="button"
                              className="rounded-xl border border-slate-700 px-3 py-2 text-xs font-semibold text-slate-100 transition hover:border-orange-400 hover:text-orange-300"
                              onClick={() => handleMarkRequestFilled(request.id)}
                              disabled={requestSubmitting}
                            >
                              {requestSubmitting ? 'Updating...' : 'Mark Filled'}
                            </button>
                          )}
                        </div>
                      </div>
                    </div>
                  )
                })
              )}
            </div>
          </div>

          {queueHistory.length > 0 && (
            <div className="mt-6 rounded-2xl border border-slate-800 bg-slate-950/60 p-4">
              <p className="text-xs uppercase tracking-wide text-slate-400">Recent calls</p>
              <div className="mt-3 space-y-2">
                {queueHistory.map((entry) => {
                  const entryProfile =
                    profilesById[entry.user_id] ||
                    (entry.user_id === user?.uid ? profile : null)
                  const displayName =
                    entryProfile?.name || entryProfile?.displayName || 'Hooper'

                  return (
                    <div key={entry.id} className="flex items-center justify-between text-sm text-slate-200">
                      <span>{displayName}</span>
                      <span className="text-xs text-slate-500">
                        {entry.status === 'confirmed' ? 'confirmed' : 'called'}
                      </span>
                    </div>
                  )
                })}
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}

export default CourtDetail
