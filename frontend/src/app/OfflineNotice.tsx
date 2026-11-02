import { useEffect, useState } from 'react'

export function OfflineNotice() {
  const [offline, setOffline] = useState(!navigator.onLine)
  useEffect(() => {
    const update = () => setOffline(!navigator.onLine)
    window.addEventListener('online', update)
    window.addEventListener('offline', update)
    return () => {
      window.removeEventListener('online', update)
      window.removeEventListener('offline', update)
    }
  }, [])
  return offline ? (
    <p className="offline-notice" role="status">
      You’re offline. Reconnect to load stories or change your saved collection.
    </p>
  ) : null
}
