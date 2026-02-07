import { addDoc, collection, serverTimestamp } from 'firebase/firestore'
import { db } from '../firebase.js'

export async function logAnalyticsEvent(userId, event, metadata = {}) {
  try {
    await addDoc(collection(db, 'analyticsEvents'), {
      user_id: userId || '',
      event,
      metadata,
      created_at: serverTimestamp(),
    })
  } catch (error) {
    // Swallow analytics failures to avoid impacting UX.
    console.error('Analytics error', error)
  }
}
