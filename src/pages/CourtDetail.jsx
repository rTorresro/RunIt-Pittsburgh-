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
import { COLLECTIONS, EXPIRATION_MS } from '../constants/firestore.js'
import {
  formatPosition,
  formatQueueDuration,
  formatRequestAge,
  formatTimeAgo,
  HOUR_MS,
} from '../utils/time.js'
import CourtAmenities from '../components/court/CourtAmenities.jsx'
import CheckInSection from '../components/court/CheckInSection.jsx'
import CurrentlyHereSection from '../components/court/CurrentlyHereSection.jsx'
import QueueSection from '../components/court/QueueSection.jsx'
import PlayerRequestsSection from '../components/court/PlayerRequestsSection.jsx'
import RecentCallsSection from '../components/court/RecentCallsSection.jsx'
import CourtChatSection from '../components/court/CourtChatSection.jsx'

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
  const checkedInUserIds = useMemo(
    () => new Set(checkIns.map((entry) => entry.user_id)),
    [checkIns]
  )

  useEffect(() => {
    if (!court) return
    const activeQuery = query(
      collection(db, COLLECTIONS.CHECK_INS),
      where('court_id', '==', court.id),
      where('status', '==', 'active')
    )

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
            if (ageMs >= EXPIRATION_MS.CHECK_IN) {
              updateDoc(doc(db, COLLECTIONS.CHECK_INS, entry.id), {
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
      collection(db, COLLECTIONS.PLAYER_REQUESTS),
      where('court_id', '==', court.id),
      where('status', '==', 'open'),
      orderBy('created_at', 'desc')
    )

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
            if (ageMs >= EXPIRATION_MS.PLAYER_REQUEST) {
              updateDoc(doc(db, COLLECTIONS.PLAYER_REQUESTS, entry.id), {
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
      collection(db, COLLECTIONS.QUEUES),
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
      collection(db, COLLECTIONS.QUEUES),
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
      collection(db, COLLECTIONS.QUEUES),
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
          const snap = await getDoc(doc(db, COLLECTIONS.USERS, uid))
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
      await addDoc(collection(db, COLLECTIONS.CHECK_INS), {
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
      await updateDoc(doc(db, COLLECTIONS.CHECK_INS, activeCheckIn.id), {
        status: 'ended',
        check_out_time: serverTimestamp(),
      })
      if (currentQueueEntry) {
        await updateDoc(doc(db, COLLECTIONS.QUEUES, currentQueueEntry.id), {
          status: 'removed',
        })
      }
      if (currentCalledEntry) {
        await updateDoc(doc(db, COLLECTIONS.QUEUES, currentCalledEntry.id), {
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
      await updateDoc(doc(db, COLLECTIONS.CHECK_INS, activeCheckIn.id), {
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
      await updateDoc(doc(db, COLLECTIONS.CHECK_INS, activeCheckIn.id), {
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
      await addDoc(collection(db, COLLECTIONS.QUEUES), {
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
      await updateDoc(doc(db, COLLECTIONS.QUEUES, entry.id), {
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
          collection(db, COLLECTIONS.QUEUES),
          where('court_id', '==', court.id),
          where('status', '==', 'called'),
          limit(1)
        )
        const calledSnapshot = await transaction.get(calledQuery)
        if (!calledSnapshot.empty) return

        const waitingQuery = query(
          collection(db, COLLECTIONS.QUEUES),
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
      await updateDoc(doc(db, COLLECTIONS.QUEUES, currentCalledEntry.id), {
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
      await addDoc(collection(db, COLLECTIONS.PLAYER_REQUESTS), {
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
      await updateDoc(doc(db, COLLECTIONS.PLAYER_REQUESTS, requestId), {
        status: 'filled',
      })
    } catch (error) {
      setActionError('Unable to update request.')
    } finally {
      setRequestSubmitting(false)
    }
  }

  const handleReportRequest = async (requestId) => {
    if (!requestId || !user || !court) return
    try {
      await addDoc(collection(db, COLLECTIONS.REPORTS), {
        type: 'player_request',
        court_id: court.id,
        target_id: requestId,
        reported_by: user.uid,
        created_at: serverTimestamp(),
      })
      setActionError('Thanks for the report. We will review it soon.')
    } catch (error) {
      setActionError('Unable to submit report.')
    }
  }

  const calledEntryAgeMs = useMemo(() => {
    if (!currentCalledEntry?.called_at?.toDate) return 0
    return now - currentCalledEntry.called_at.toDate().getTime()
  }, [currentCalledEntry, now])

  const shouldShowCalledBanner =
    calledEntryAgeMs > 0 && calledEntryAgeMs < EXPIRATION_MS.QUEUE_CALLED

  useEffect(() => {
    if (!calledEntries.length) return
    const expired = calledEntries.find((entry) => {
      if (!entry.called_at?.toDate) return false
      return now - entry.called_at.toDate().getTime() >= EXPIRATION_MS.QUEUE_CALLED
    })
    if (!expired) return

    const expireAndCallNext = async () => {
      await updateDoc(doc(db, COLLECTIONS.QUEUES, expired.id), {
        status: 'removed',
      })
      await handleCallNext()
    }

    expireAndCallNext()
  }, [calledEntries, now])

  const activeCheckInAgeMs = useMemo(() => {
    if (!activeCheckIn?.check_in_time?.toDate) return 0
    return now - activeCheckIn.check_in_time.toDate().getTime()
  }, [activeCheckIn, now])

  const shouldShowExtend = activeCheckInAgeMs >= 2 * HOUR_MS
  const shouldShowExpiryBanner =
    activeCheckInAgeMs >= 2.25 * HOUR_MS && activeCheckInAgeMs < EXPIRATION_MS.CHECK_IN

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

          <CourtAmenities court={court} />

          <div className="mt-6 rounded-2xl border border-slate-800 bg-slate-950/60 p-4">
            <p className="text-xs uppercase tracking-wide text-slate-400">Court info</p>
            <ul className="mt-3 space-y-2 text-sm text-slate-200">
              <li>Outdoor</li>
              <li>2 hoops</li>
              <li>Lights available</li>
            </ul>
          </div>

          <CheckInSection
            activeCheckIn={activeCheckIn}
            shouldShowExpiryBanner={shouldShowExpiryBanner}
            currentCalledEntry={currentCalledEntry}
            shouldShowCalledBanner={shouldShowCalledBanner}
            shouldShowExtend={shouldShowExtend}
            submitting={submitting}
            onConfirmPlaying={handleConfirmPlaying}
            onExtend={handleExtend}
            onCheckOut={handleCheckOut}
            onCheckIn={handleCheckIn}
            onToggleLooking={handleLookingForTeamToggle}
          />

          <CurrentlyHereSection
            checkIns={checkIns}
            loading={checkInsLoading}
            profilesById={profilesById}
            user={user}
            profile={profile}
            formatTimeAgo={formatTimeAgo}
            now={now}
          />

          <QueueSection
            queueEntries={queueEntries}
            loading={queueLoading}
            activeCheckIn={activeCheckIn}
            currentQueueEntry={currentQueueEntry}
            currentCalledEntry={currentCalledEntry}
            currentQueueIndex={currentQueueIndex}
            profilesById={profilesById}
            user={user}
            profile={profile}
            calledEntriesCount={calledEntries.length}
            submitting={submitting}
            formatPosition={formatPosition}
            formatQueueDuration={formatQueueDuration}
            now={now}
            onCallNext={handleCallNext}
            onJoinQueue={handleJoinQueue}
            onLeaveQueue={handleLeaveQueue}
          />

          <PlayerRequestsSection
            playerRequests={playerRequests}
            loading={requestsLoading}
            requestForm={requestForm}
            requestSubmitting={requestSubmitting}
            activeCheckIn={activeCheckIn}
            profilesById={profilesById}
            user={user}
            profile={profile}
            courtName={court.name}
            formatRequestAge={formatRequestAge}
            now={now}
            onRequestChange={handleRequestChange}
            onSubmitRequest={handleSubmitRequest}
            onMarkFilled={handleMarkRequestFilled}
            onReportRequest={handleReportRequest}
          />

          <CourtChatSection
            courtId={court.id}
            courtName={court.name}
            user={user}
            profile={profile}
            checkedInUserIds={checkedInUserIds}
          />

          <RecentCallsSection
            queueHistory={queueHistory}
            profilesById={profilesById}
            user={user}
            profile={profile}
          />
        </div>
      </div>
    </div>
  )
}

export default CourtDetail
