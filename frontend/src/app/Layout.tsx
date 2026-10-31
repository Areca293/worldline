import { useEffect } from 'react'
import type { ReactNode } from 'react'
import { Link, useLocation } from 'react-router-dom'
import { AccountNav } from '../account/AccountNav'
import { ConnectionStatus } from '../sources/SourceStatus'
import { OfflineNotice } from './OfflineNotice'

export function Layout({ children }: { children: ReactNode }) {
  const { pathname, search } = useLocation()
  useEffect(() => {
    window.scrollTo(0, 0)
  }, [pathname, search])
  return (
    <>
      <a className="skip-link" href="#main">
        Skip to content
      </a>
      <div className="shell">
        <header className="header">
          <Link className="brand" to="/" aria-label="Worldline home">
            WORLDLINE
          </Link>
          <div className="header-right">
            <AccountNav />
          </div>
        </header>
        <main id="main">
          <OfflineNotice />
          {children}
        </main>
        <footer>
          <Link className="footer-brand" to="/">
            WORLDLINE
          </Link>
          <span>A small daily habit. A broader perspective.</span>
          <ConnectionStatus />
        </footer>
      </div>
    </>
  )
}
