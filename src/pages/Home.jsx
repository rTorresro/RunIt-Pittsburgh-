import { useEffect, useMemo, useState } from 'react'
import { useNavigate, useParams } from 'react-router-dom'
import { MapContainer, TileLayer, Marker, Popup, useMap } from 'react-leaflet'
import { AnimatePresence, motion } from 'framer-motion'
import L from 'leaflet'
import courts from '../data/courts.js'
import { collection, limit, onSnapshot, orderBy, query, where } from 'firebase/firestore'
import { db } from '../firebase.js'
import CourtDetail from './CourtDetail.jsx'
import { COLLECTIONS } from '../constants/firestore.js'
import CourtFilters from '../components/map/CourtFilters.jsx'

const center = [40.4406, -79.9959]

const buildMarkerIcon = ({ isSelected, hasActive, unreadCount }) => {
  const dotClasses = [
    'marker-dot',
    hasActive ? 'marker-dot--active' : '',
    isSelected ? 'marker-dot--selected' : '',
  ]
    .filter(Boolean)
    .join(' ')
  const badge =
    unreadCount && unreadCount > 0
      ? `<span class="marker-badge">${unreadCount}</span>`
      : ''

  return new L.DivIcon({
    className: 'runit-marker',
    html: `<div class="${dotClasses}">${badge}</div>`,
    iconSize: [22, 22],
    iconAnchor: [11, 11],
  })
}

const mapBounds = L.latLngBounds(
  courts.map((court) => [court.latitude, court.longitude])
)

function Home() {
  const navigate = useNavigate()
  const { id: activeCourtId } = useParams()
  const [checkInCounts, setCheckInCounts] = useState({})
  const [activeRequestCourts, setActiveRequestCourts] = useState(new Set())
  const [showOnlyRequests, setShowOnlyRequests] = useState(false)
  const [checkInsLoading, setCheckInsLoading] = useState(true)
  const [requestsLoading, setRequestsLoading] = useState(true)
  const [mapError, setMapError] = useState('')
  const [locationError, setLocationError] = useState('')
  const [locationEnabled, setLocationEnabled] = useState(true)
  const [searchQuery, setSearchQuery] = useState('')
  const [filterOutdoor, setFilterOutdoor] = useState(false)
  const [filterLights, setFilterLights] = useState(false)
  const [unreadCounts, setUnreadCounts] = useState({})
  const [viewportHeight, setViewportHeight] = useState(() =>
    typeof window === 'undefined' ? 800 : window.innerHeight
  )
  const [viewportWidth, setViewportWidth] = useState(() =>
    typeof window === 'undefined' ? 1280 : window.innerWidth
  )
  const [sheetY, setSheetY] = useState(0)
  const [leftPanelWidth, setLeftPanelWidth] = useState(50)
  const [isResizing, setIsResizing] = useState(false)

  useEffect(() => {
    const stored = localStorage.getItem('runit_settings')
    if (stored) {
      try {
        const parsed = JSON.parse(stored)
        if (typeof parsed.locationEnabled === 'boolean') {
          setLocationEnabled(parsed.locationEnabled)
        }
      } catch (error) {
        console.warn('Failed to parse settings', error)
      }
    }
  }, [])

  useEffect(() => {
    const handleResize = () => {
      setViewportHeight(window.innerHeight)
      setViewportWidth(window.innerWidth)
    }
    window.addEventListener('resize', handleResize)
    return () => window.removeEventListener('resize', handleResize)
  }, [])

  useEffect(() => {
    const handleSettingsUpdate = () => {
      const stored = localStorage.getItem('runit_settings')
      if (!stored) return
      try {
        const parsed = JSON.parse(stored)
        if (typeof parsed.locationEnabled === 'boolean') {
          setLocationEnabled(parsed.locationEnabled)
        }
      } catch (error) {
        console.warn('Failed to parse settings', error)
      }
    }

    window.addEventListener('runit-settings', handleSettingsUpdate)
    return () => window.removeEventListener('runit-settings', handleSettingsUpdate)
  }, [])

  useEffect(() => {
    if (!locationEnabled || !navigator.geolocation) return
    navigator.geolocation.getCurrentPosition(
      () => setLocationError(''),
      (error) => {
        if (error.code === error.PERMISSION_DENIED) {
          setLocationError('Location permission denied. Showing default courts.')
        }
      }
    )
  }, [locationEnabled])

  useEffect(() => {
    const activeQuery = query(
      collection(db, COLLECTIONS.CHECK_INS),
      where('status', '==', 'active')
    )

    setCheckInsLoading(true)
    const unsubscribe = onSnapshot(
      activeQuery,
      (snapshot) => {
        const counts = snapshot.docs.reduce((acc, docSnap) => {
          const data = docSnap.data()
          if (!data?.court_id) return acc
          acc[data.court_id] = (acc[data.court_id] || 0) + 1
          return acc
        }, {})
        setCheckInCounts(counts)
        setCheckInsLoading(false)
      },
      (error) => {
        console.error('Check-in listener error', error)
        setMapError('Unable to load check-ins. Check your connection.')
        setCheckInsLoading(false)
      }
    )

    return unsubscribe
  }, [])

  useEffect(() => {
    const requestQuery = query(
      collection(db, COLLECTIONS.PLAYER_REQUESTS),
      where('status', '==', 'open')
    )

    setRequestsLoading(true)
    const unsubscribe = onSnapshot(
      requestQuery,
      (snapshot) => {
        const activeCourts = new Set()
        snapshot.docs.forEach((docSnap) => {
          const data = docSnap.data()
          if (!data?.court_id) return
          activeCourts.add(data.court_id)
        })
        setActiveRequestCourts(activeCourts)
        setRequestsLoading(false)
      },
      (error) => {
        console.error('Player request listener error', error)
        setMapError('Unable to load player requests. Try again soon.')
        setRequestsLoading(false)
      }
    )

    return unsubscribe
  }, [])

  const countsByCourt = useMemo(() => checkInCounts, [checkInCounts])
  const filteredCourts = useMemo(() => {
    const queryText = searchQuery.trim().toLowerCase()
    return courts.filter((court) => {
      if (showOnlyRequests && !activeRequestCourts.has(court.id)) return false
      if (filterOutdoor && !court.outdoor) return false
      if (filterLights && !court.has_lights) return false
      if (!queryText) return true
      return (
        court.name.toLowerCase().includes(queryText) ||
        court.address.toLowerCase().includes(queryText)
      )
    })
  }, [showOnlyRequests, activeRequestCourts, filterOutdoor, filterLights, searchQuery])

  const isMobile = viewportWidth < 768
  const isTablet = viewportWidth >= 768 && viewportWidth < 1200
  const splitLeftWidth = isTablet ? 40 : leftPanelWidth
  const splitRightWidth = 100 - splitLeftWidth

  const sheetHeight = Math.round(viewportHeight * 0.85)
  const collapsedY = Math.round(viewportHeight * 0.45)
  const closedY = Math.round(viewportHeight * 0.95)

  useEffect(() => {
    if (activeCourtId) {
      setSheetY(collapsedY)
      localStorage.setItem(`runit_last_read_${activeCourtId}`, String(Date.now()))
    }
  }, [activeCourtId, collapsedY])

  const handleSheetDragEnd = (event, info) => {
    const nextY = Math.max(0, Math.min(sheetY + info.offset.y, closedY))
    const closeThreshold = viewportHeight * 0.75
    const expandThreshold = collapsedY * 0.45

    if (nextY > closeThreshold) {
      setSheetY(closedY)
      setTimeout(() => navigate('/'), 200)
      return
    }

    if (nextY < expandThreshold) {
      setSheetY(0)
    } else {
      setSheetY(collapsedY)
    }
  }

  const handleResizeStart = () => {
    setIsResizing(true)
  }

  const handleResizeMove = (event) => {
    if (!isResizing) return
    const clientX = event.clientX ?? event.touches?.[0]?.clientX
    if (!clientX) return
    const nextPercent = Math.min(70, Math.max(30, (clientX / viewportWidth) * 100))
    setLeftPanelWidth(nextPercent)
  }

  const handleResizeEnd = () => {
    setIsResizing(false)
  }

  const selectedCourt = useMemo(
    () => courts.find((court) => court.id === activeCourtId),
    [activeCourtId]
  )

  const resetSelection = () => {
    navigate('/')
  }

  const MapController = () => {
    const map = useMap()

    useEffect(() => {
      if (!selectedCourt) {
        map.fitBounds(mapBounds, { padding: [40, 40] })
        return
      }
      map.flyTo([selectedCourt.latitude, selectedCourt.longitude], 14, {
        duration: 0.6,
      })
    }, [map, selectedCourt])

    return null
  }

  useEffect(() => {
    const unsubscribers = courts.map((court) => {
      const messagesRef = collection(db, COLLECTIONS.COURTS, court.id, 'messages')
      const messagesQuery = query(messagesRef, orderBy('timestamp', 'desc'), limit(50))

      return onSnapshot(messagesQuery, (snapshot) => {
        const lastRead = Number(localStorage.getItem(`runit_last_read_${court.id}`) || 0)
        const count = snapshot.docs.reduce((acc, docSnap) => {
          const data = docSnap.data()
          const ts = data.timestamp?.toDate?.()
          if (!ts) return acc
          if (ts.getTime() > lastRead) return acc + 1
          return acc
        }, 0)
        setUnreadCounts((prev) => ({ ...prev, [court.id]: count }))
      })
    })

    return () => unsubscribers.forEach((unsubscribe) => unsubscribe())
  }, [])

  return (
    <div
      className="relative w-full h-[calc(100vh-4.25rem)] overflow-hidden"
      onMouseMove={handleResizeMove}
      onMouseUp={handleResizeEnd}
      onMouseLeave={handleResizeEnd}
      onTouchMove={handleResizeMove}
      onTouchEnd={handleResizeEnd}
    >
      <div className="absolute left-4 top-4 z-[500] w-64 max-w-[70vw]">
        <CourtFilters
          searchQuery={searchQuery}
          onSearchChange={setSearchQuery}
          filterOutdoor={filterOutdoor}
          filterLights={filterLights}
          onToggleOutdoor={() => setFilterOutdoor((prev) => !prev)}
          onToggleLights={() => setFilterLights((prev) => !prev)}
          showOnlyRequests={showOnlyRequests}
          onToggleRequests={() => setShowOnlyRequests((prev) => !prev)}
        />
      </div>
      {(checkInsLoading || requestsLoading) && (
        <div className="absolute right-4 top-4 z-[500] rounded-full border border-slate-800 bg-slate-950/90 px-3 py-2 text-xs text-slate-300 shadow-lg">
          Loading live updates...
        </div>
      )}
      {(mapError || locationError) && (
        <div className="absolute left-4 top-16 z-[500] max-w-xs rounded-2xl border border-orange-500/40 bg-orange-500/10 px-3 py-2 text-xs text-orange-200 shadow-lg">
          {mapError || locationError}
        </div>
      )}
      {!filteredCourts.length && !checkInsLoading && !requestsLoading && (
        <div className="absolute inset-0 z-[400] flex items-center justify-center px-6 text-center">
          <div className="rounded-2xl border border-slate-800 bg-slate-950/90 p-4 text-sm text-slate-300 shadow-lg">
            No courts nearby. Try turning off the filter.
          </div>
        </div>
      )}
      {isMobile ? (
        <>
          <MapContainer center={center} zoom={12.2} className="h-full w-full">
            <TileLayer
              attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>'
              url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
            />
            <MapController />

            {filteredCourts.map((court) => {
              const hasActive = (countsByCourt[court.id] || 0) > 0
              const isSelected = activeCourtId === court.id
              const icon = buildMarkerIcon({
                isSelected,
                hasActive,
                unreadCount: unreadCounts[court.id] || 0,
              })

              return (
                <Marker
                  key={court.id}
                  position={[court.latitude, court.longitude]}
                  icon={icon}
                  eventHandlers={{
                    click: () => navigate(`/courts/${court.id}`),
                  }}
                >
                  <Popup>
                    <div className="text-sm font-semibold text-slate-900">
                      {court.name}
                    </div>
                  </Popup>
                </Marker>
              )
            })}
          </MapContainer>

          {activeCourtId && (
            <div className="pointer-events-none absolute inset-0 bg-slate-950/20 backdrop-blur-sm transition-opacity duration-300" />
          )}

          <AnimatePresence>
            {activeCourtId && (
              <motion.div
                key={activeCourtId}
                className="absolute bottom-0 left-0 right-0 z-[600] mx-auto w-full max-w-2xl rounded-t-3xl border border-slate-800 bg-slate-900/95 shadow-2xl"
                style={{ height: sheetHeight }}
                initial={{ y: closedY }}
                animate={{ y: sheetY }}
                exit={{ y: closedY }}
                transition={{ type: 'spring', damping: 30, stiffness: 300 }}
                drag="y"
                dragConstraints={{
                  top: -sheetY,
                  bottom: closedY - sheetY,
                }}
                dragElastic={0.2}
                onDragEnd={handleSheetDragEnd}
              >
                <div className="flex items-center justify-center py-3">
                  <div className="h-1.5 w-12 rounded-full bg-slate-700" />
                </div>
                <div className="h-[calc(100%-1.5rem)] pb-6">
                  <CourtDetail
                    courtId={activeCourtId}
                    onClose={() => {
                      setSheetY(closedY)
                      setTimeout(() => navigate('/'), 200)
                    }}
                    variant="sheet"
                  />
                </div>
              </motion.div>
            )}
          </AnimatePresence>
        </>
      ) : (
        <div className="grid h-full" style={{ gridTemplateColumns: `${splitLeftWidth}% ${splitRightWidth}%` }}>
          <div className="relative h-full">
            <MapContainer center={center} zoom={12.2} className="h-full w-full">
              <TileLayer
                attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>'
                url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
              />
              <MapController />

              {filteredCourts.map((court) => {
                const hasActive = (countsByCourt[court.id] || 0) > 0
                const isSelected = activeCourtId === court.id
                const icon = buildMarkerIcon({
                  isSelected,
                  hasActive,
                  unreadCount: unreadCounts[court.id] || 0,
                })

                return (
                  <Marker
                    key={court.id}
                    position={[court.latitude, court.longitude]}
                    icon={icon}
                    eventHandlers={{
                      click: () => navigate(`/courts/${court.id}`),
                    }}
                  >
                    <Popup>
                      <div className="text-sm font-semibold text-slate-900">
                        {court.name}
                      </div>
                    </Popup>
                  </Marker>
                )
              })}
            </MapContainer>

            {activeCourtId && (
              <div className="pointer-events-none absolute inset-0 bg-slate-950/10 backdrop-blur-sm transition-opacity duration-300" />
            )}
          </div>

          <div className="relative h-full overflow-hidden border-l border-slate-800 bg-slate-950">
            <AnimatePresence mode="wait">
              {activeCourtId ? (
                <motion.div
                  key={activeCourtId}
                  className="h-full overflow-y-auto px-6 py-6"
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: -10 }}
                  transition={{ duration: 0.25 }}
                >
                  <CourtDetail
                    courtId={activeCourtId}
                    onClose={resetSelection}
                    variant="panel"
                  />
                </motion.div>
              ) : (
                <motion.div
                  key="welcome"
                  className="h-full overflow-y-auto px-6 py-6"
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  exit={{ opacity: 0 }}
                  transition={{ duration: 0.2 }}
                >
                  <div className="rounded-3xl border border-slate-800 bg-slate-900/80 p-6 shadow-xl">
                    <h2 className="text-2xl font-semibold text-slate-50">Find your run</h2>
                    <p className="mt-2 text-sm text-slate-400">
                      Select a court to check in, join the queue, or find players.
                    </p>
                    <div className="mt-6">
                      <CourtFilters
                        searchQuery={searchQuery}
                        onSearchChange={setSearchQuery}
                        filterOutdoor={filterOutdoor}
                        filterLights={filterLights}
                        onToggleOutdoor={() => setFilterOutdoor((prev) => !prev)}
                        onToggleLights={() => setFilterLights((prev) => !prev)}
                        showOnlyRequests={showOnlyRequests}
                        onToggleRequests={() => setShowOnlyRequests((prev) => !prev)}
                      />
                    </div>
                    <div className="mt-6 grid gap-3">
                      {filteredCourts.map((court) => (
                        <button
                          key={court.id}
                          type="button"
                          className="rounded-2xl border border-slate-800 bg-slate-950/60 p-4 text-left transition hover:border-orange-400"
                          onClick={() => navigate(`/courts/${court.id}`)}
                        >
                          <p className="text-sm font-semibold text-slate-100">{court.name}</p>
                          <p className="mt-1 text-xs text-slate-400">{court.address}</p>
                        </button>
                      ))}
                    </div>
                  </div>
                </motion.div>
              )}
            </AnimatePresence>
          </div>

          {!isTablet && (
            <div
              className={`absolute left-0 top-0 h-full w-2 cursor-col-resize ${isResizing ? 'bg-orange-400/30' : 'bg-transparent'}`}
              style={{ left: `${splitLeftWidth}%` }}
              onMouseDown={handleResizeStart}
              onTouchStart={handleResizeStart}
            />
          )}
        </div>
      )}
    </div>
  )
}

export default Home
