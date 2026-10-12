import { createContext } from 'react'

/**
 * Set by the phone layout: the Plan tab's notebook calls it with true once its own hours bar has
 * scrolled up out of view, and with false when it comes back or the tab closes. Nobody sets it on
 * the desk, where the numbers and the notebook are both always in view.
 */
export const HoursBarOutOfView = createContext<((out: boolean) => void) | null>(null)
