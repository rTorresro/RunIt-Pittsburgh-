import { initializeApp } from 'firebase-admin/app'
import { getFirestore, Timestamp } from 'firebase-admin/firestore'
import { onSchedule } from 'firebase-functions/v2/scheduler'

initializeApp()

const db = getFirestore()

const EXPIRATION_MS = {
  CHECK_IN: 2.5 * 60 * 60 * 1000,
  PLAYER_REQUEST: 60 * 60 * 1000,
}

export const expireStaleDocs = onSchedule('every 10 minutes', async () => {
  const now = Date.now()
  const checkInsSnapshot = await db
    .collection('checkIns')
    .where('status', '==', 'active')
    .get()

  const checkInBatch = db.batch()
  checkInsSnapshot.forEach((docSnap) => {
    const data = docSnap.data()
    const checkInTime = data.check_in_time?.toDate?.()
    if (!checkInTime) return
    const ageMs = now - checkInTime.getTime()
    if (ageMs >= EXPIRATION_MS.CHECK_IN) {
      checkInBatch.update(docSnap.ref, {
        status: 'expired',
        expired_at: Timestamp.fromMillis(now),
      })
    }
  })
  await checkInBatch.commit()

  const requestsSnapshot = await db
    .collection('playerRequests')
    .where('status', '==', 'open')
    .get()

  const requestBatch = db.batch()
  requestsSnapshot.forEach((docSnap) => {
    const data = docSnap.data()
    const createdAt = data.created_at?.toDate?.()
    if (!createdAt) return
    const ageMs = now - createdAt.getTime()
    if (ageMs >= EXPIRATION_MS.PLAYER_REQUEST) {
      requestBatch.update(docSnap.ref, {
        status: 'expired',
        expired_at: Timestamp.fromMillis(now),
      })
    }
  })
  await requestBatch.commit()
})
