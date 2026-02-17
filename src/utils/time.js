export const MINUTE_MS = 60000
export const HOUR_MS = 60 * MINUTE_MS
export const DAY_MS = 24 * HOUR_MS

export function formatTimeAgo(timestamp, now = Date.now()) {
  if (!timestamp?.toDate) return 'just now'
  const diff = Math.max(now - timestamp.toDate().getTime(), 0)
  const minutes = Math.floor(diff / MINUTE_MS)
  if (minutes < 1) return 'just now'
  if (minutes < 60) return `${minutes} min ago`
  const hours = Math.floor(minutes / 60)
  if (hours < 24) return `${hours} hour${hours === 1 ? '' : 's'} ago`
  const days = Math.floor(hours / 24)
  return `${days} day${days === 1 ? '' : 's'} ago`
}

export function formatQueueDuration(timestamp, now = Date.now()) {
  if (!timestamp?.toDate) return 'waiting now'
  const diff = Math.max(now - timestamp.toDate().getTime(), 0)
  const minutes = Math.floor(diff / MINUTE_MS)
  if (minutes < 1) return 'waiting now'
  if (minutes < 60) return `waiting ${minutes} min`
  const hours = Math.floor(minutes / 60)
  return `waiting ${hours} hr`
}

export function formatRequestAge(timestamp, now = Date.now()) {
  if (!timestamp?.toDate) return 'just now'
  const diff = Math.max(now - timestamp.toDate().getTime(), 0)
  const minutes = Math.floor(diff / MINUTE_MS)
  if (minutes < 1) return 'just now'
  if (minutes < 60) return `${minutes} min ago`
  const hours = Math.floor(minutes / 60)
  return `${hours} hr ago`
}

export function formatPosition(index) {
  const position = index + 1
  if (position % 10 === 1 && position % 100 !== 11) return `${position}st`
  if (position % 10 === 2 && position % 100 !== 12) return `${position}nd`
  if (position % 10 === 3 && position % 100 !== 13) return `${position}rd`
  return `${position}th`
}
