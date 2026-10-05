import { jsDayToWeekday } from './mappers'
import { Weekday } from '@prisma/client'

// All comparisons below operate on naive "HH:MM" / ISO "YYYY-MM-DD" strings,
// interpreted in the tutor's own local timezone (TutorProfile.timezone).
// Lexical string comparison is safe for both formats since they're zero-padded.

export function minutesSinceMidnight(hhmm: string): number {
  const [h, m] = hhmm.split(':').map(Number)
  return h * 60 + m
}

export function weekdayForDate(isoDate: string): Weekday {
  // Parse as a plain calendar date (no timezone shift).
  const [y, m, d] = isoDate.split('-').map(Number)
  const jsDay = new Date(Date.UTC(y, m - 1, d)).getUTCDay()
  return jsDayToWeekday[jsDay]
}

export function timeRangesOverlap(aStart: string, aEnd: string, bStart: string, bEnd: string): boolean {
  return minutesSinceMidnight(aStart) < minutesSinceMidnight(bEnd) && minutesSinceMidnight(bStart) < minutesSinceMidnight(aEnd)
}

export function dateRangesOverlap(aStart: string, aEnd: string, bStart: string, bEnd: string): boolean {
  return aStart <= bEnd && bStart <= aEnd
}

export function dateInRange(date: string, start: string, end: string): boolean {
  return date >= start && date <= end
}

/** Slot [start,end) fully contains the [start,end) window. */
export function slotContainsWindow(slotStart: string, slotEnd: string, windowStart: string, windowEnd: string): boolean {
  return minutesSinceMidnight(slotStart) <= minutesSinceMidnight(windowStart) && minutesSinceMidnight(windowEnd) <= minutesSinceMidnight(slotEnd)
}

export function addMinutes(hhmm: string, minutes: number): string {
  const total = minutesSinceMidnight(hhmm) + minutes
  const h = Math.floor(total / 60) % 24
  const m = total % 60
  return `${String(h).padStart(2, '0')}:${String(m).padStart(2, '0')}`
}

/** Combine an ISO date + "HH:MM" into a real Date for "has this passed?" checks. */
export function toDateTime(isoDate: string, hhmm: string): Date {
  const [y, mo, d] = isoDate.split('-').map(Number)
  const [h, mi] = hhmm.split(':').map(Number)
  return new Date(y, mo - 1, d, h, mi)
}
