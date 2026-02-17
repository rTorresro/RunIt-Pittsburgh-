export function getAuthErrorMessage(error) {
  const code = error?.code || ''

  if (code.includes('auth/invalid-email')) {
    return 'Enter a valid email address.'
  }
  if (code.includes('auth/user-not-found')) {
    return 'No account found for that email.'
  }
  if (code.includes('auth/wrong-password')) {
    return 'Incorrect password. Try again.'
  }
  if (code.includes('auth/email-already-in-use')) {
    return 'That email is already registered.'
  }
  if (code.includes('auth/weak-password')) {
    return 'Password is too weak. Use at least 6 characters.'
  }
  if (code.includes('auth/too-many-requests')) {
    return 'Too many attempts. Please wait and try again.'
  }
  if (code.includes('auth/network-request-failed')) {
    return 'Network error. Check your connection.'
  }

  return 'Something went wrong. Please try again.'
}
