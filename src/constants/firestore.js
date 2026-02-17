export const COLLECTIONS = {
  CHECK_INS: 'checkIns',
  QUEUES: 'queues',
  PLAYER_REQUESTS: 'playerRequests',
  COURTS: 'courts',
  ANNOUNCEMENTS: 'announcements',
  USERS: 'users',
  ANALYTICS: 'analyticsEvents',
  REPORTS: 'reports',
}

export const EXPIRATION_MS = {
  CHECK_IN: 2.5 * 60 * 60 * 1000,
  PLAYER_REQUEST: 60 * 60 * 1000,
  QUEUE_CALLED: 5 * 60 * 1000,
}
