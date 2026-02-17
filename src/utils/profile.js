import {
  doc,
  getDoc,
  serverTimestamp,
  setDoc,
  updateDoc,
} from 'firebase/firestore'
import { db } from '../firebase.js'
import { COLLECTIONS } from '../constants/firestore.js'

export async function getUserProfile(uid) {
  if (!uid) return null
  const ref = doc(db, COLLECTIONS.USERS, uid)
  const snapshot = await getDoc(ref)
  return snapshot.exists() ? snapshot.data() : null
}

export async function createUserProfile({
  uid,
  email,
  name,
  skill_level,
  preferred_position,
  photo_url,
}) {
  const ref = doc(db, COLLECTIONS.USERS, uid)
  await setDoc(ref, {
    uid,
    email,
    name,
    skill_level,
    preferred_position,
    photo_url: photo_url || '',
    created_at: serverTimestamp(),
  })
}

export async function updateUserProfile(uid, updates) {
  const ref = doc(db, COLLECTIONS.USERS, uid)
  await updateDoc(ref, updates)
}
