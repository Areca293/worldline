import { useLayoutEffect, useRef } from 'react'
import type { ReactNode } from 'react'

export function ReadingSidebar({
  children,
  onHide,
}: {
  children: ReactNode
  onHide: () => void
}) {
  const sidebar = useRef<HTMLElement>(null)

  useLayoutEffect(() => {
    const element = sidebar.current!
    let frame = 0
    function measure() {
      frame = 0
      if (getComputedStyle(element).position === 'sticky') {
        const top = Math.max(16, element.getBoundingClientRect().top)
        element.style.height = `${Math.max(160, window.innerHeight - top - 16)}px`
        element.style.maxHeight = element.style.height
      } else {
        element.style.removeProperty('max-height')
        element.style.removeProperty('height')
      }
    }
    function schedule() {
      if (!frame) frame = requestAnimationFrame(measure)
    }
    measure()
    window.addEventListener('scroll', schedule, { passive: true })
    window.addEventListener('resize', schedule)
    // Account loading and font loading can change the space above the sidebar.
    const observer =
      typeof ResizeObserver === 'undefined'
        ? null
        : new ResizeObserver(schedule)
    for (const selector of ['.header', '.intro', '.story-search']) {
      const section = document.querySelector(selector)
      if (section) observer?.observe(section)
    }
    return () => {
      cancelAnimationFrame(frame)
      observer?.disconnect()
      window.removeEventListener('scroll', schedule)
      window.removeEventListener('resize', schedule)
    }
  }, [])

  return (
    <aside
      id="explore-sidebar"
      ref={sidebar}
      className="reading-tools"
      aria-label="Explore filters"
      tabIndex={0}
    >
      <button
        id="hide-filters"
        className="sidebar-toggle"
        aria-expanded={true}
        aria-controls="explore-sidebar"
        onClick={onHide}
      >
        Hide filters <span aria-hidden="true">←</span>
      </button>
      {children}
    </aside>
  )
}
