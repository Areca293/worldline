import { useLayoutEffect, useRef } from 'react'
import type { ReactNode } from 'react'

export function ReadingSidebar({
  children,
  collapsed,
  onToggle,
}: {
  children: ReactNode
  collapsed: boolean
  onToggle: () => void
}) {
  const frame = useRef<HTMLDivElement>(null)
  const sidebar = useRef<HTMLElement>(null)

  useLayoutEffect(() => {
    const element = frame.current!
    let animation = 0
    function measure() {
      animation = 0
      if (getComputedStyle(element).position === 'sticky') {
        const top = Math.max(16, element.getBoundingClientRect().top)
        element.style.height = `${Math.max(160, window.innerHeight - top - 16)}px`
      } else {
        element.style.removeProperty('height')
      }
    }
    function schedule() {
      if (!animation) animation = requestAnimationFrame(measure)
    }
    measure()
    window.addEventListener('scroll', schedule, { passive: true })
    window.addEventListener('resize', schedule)
    const observer =
      typeof ResizeObserver === 'undefined'
        ? null
        : new ResizeObserver(schedule)
    for (const selector of ['.header', '.intro', '.story-search']) {
      const section = document.querySelector(selector)
      if (section) observer?.observe(section)
    }
    return () => {
      cancelAnimationFrame(animation)
      observer?.disconnect()
      window.removeEventListener('scroll', schedule)
      window.removeEventListener('resize', schedule)
    }
  }, [])

  useLayoutEffect(() => {
    const element = sidebar.current!
    let timeout: ReturnType<typeof setTimeout>
    let dragging = false
    function reveal() {
      clearTimeout(timeout)
      element.dataset.scrollActive = 'true'
      if (!dragging)
        timeout = setTimeout(() => {
          element.dataset.scrollActive = 'false'
        }, 1400)
    }
    function startDrag() {
      dragging = true
      reveal()
    }
    function stopDrag() {
      if (dragging) {
        dragging = false
        reveal()
      }
    }
    const events = [
      'pointerenter',
      'pointermove',
      'scroll',
      'wheel',
      'keydown',
      'focusin',
    ]
    events.forEach((event) =>
      element.addEventListener(event, reveal, { passive: true }),
    )
    element.addEventListener('pointerdown', startDrag)
    window.addEventListener('pointerup', stopDrag)
    window.addEventListener('pointercancel', stopDrag)
    reveal()
    return () => {
      clearTimeout(timeout)
      events.forEach((event) => element.removeEventListener(event, reveal))
      element.removeEventListener('pointerdown', startDrag)
      window.removeEventListener('pointerup', stopDrag)
      window.removeEventListener('pointercancel', stopDrag)
    }
  }, [collapsed])

  return (
    <div
      ref={frame}
      className={`sidebar-frame${collapsed ? ' is-collapsed' : ''}`}
    >
      <aside
        id="explore-sidebar"
        ref={sidebar}
        className="reading-tools"
        aria-label="Explore filters"
        tabIndex={0}
        hidden={collapsed}
      >
        {children}
      </aside>
      <button
        className="sidebar-toggle"
        aria-label={collapsed ? 'Show filters' : 'Hide filters'}
        aria-expanded={!collapsed}
        aria-controls="explore-sidebar"
        onClick={onToggle}
      >
        <svg
          viewBox="0 0 24 24"
          width="20"
          height="20"
          fill="none"
          stroke="currentColor"
          strokeWidth="1.8"
          strokeLinecap="round"
          strokeLinejoin="round"
          aria-hidden="true"
        >
          <path d={collapsed ? 'm9 5 7 7-7 7' : 'm15 5-7 7 7 7'} />
        </svg>
      </button>
    </div>
  )
}
