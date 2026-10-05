import { prisma } from '../lib/prisma'
import { ApiError } from '../utils/errors'
import { weekdayFromApi, weekdayToApi } from '../utils/mappers'
import { addMinutes, dateInRange, slotContainsWindow, timeRangesOverlap, weekdayForDate } from '../utils/time'
import { getTutorOr404 } from './tutor.service'
import { Weekday } from '@prisma/client'

export interface AvailabilityInput {
  day: string
  start: string
  end: string
}
export interface TimeOffInput {
  id?: string
  label: string
  start: string
  end: string
}

function assertNoInternalOverlap(slots: AvailabilityInput[]) {
  const byDay = new Map<string, AvailabilityInput[]>()
  for (const s of slots) {
    if (s.start >= s.end) throw ApiError.badRequest(`Invalid slot: start (${s.start}) must be before end (${s.end})`)
    if (!byDay.has(s.day)) byDay.set(s.day, [])
    byDay.get(s.day)!.push(s)
  }
  for (const [day, daySlots] of byDay) {
    for (let i = 0; i < daySlots.length; i++) {
      for (let j = i + 1; j < daySlots.length; j++) {
        if (timeRangesOverlap(daySlots[i].start, daySlots[i].end, daySlots[j].start, daySlots[j].end)) {
          throw ApiError.badRequest(`Overlapping availability slots on ${day}: ${daySlots[i].start}-${daySlots[i].end} and ${daySlots[j].start}-${daySlots[j].end}`)
        }
      }
    }
  }
}

async function findUpcomingSessions(tutorId: string) {
  return prisma.session.findMany({ where: { tutorId, status: 'UPCOMING' } })
}

export async function setAvailability(tutorId: string, rawSlots: AvailabilityInput[]) {
  await getTutorOr404(tutorId)
  assertNoInternalOverlap(rawSlots)

  const sessions = await findUpcomingSessions(tutorId)
  const orphaned = sessions.filter((session) => {
    const day = weekdayForDate(session.date)
    const sessionEnd = addMinutes(session.time, session.durationMins)
    return !rawSlots.some(
      (slot) => weekdayFromApi[slot.day] === day && slotContainsWindow(slot.start, slot.end, session.time, sessionEnd),
    )
  })
  if (orphaned.length) {
    throw ApiError.conflict(
      'This availability change would leave existing upcoming sessions outside your working hours. Cancel or reschedule them first.',
      { sessionIds: orphaned.map((s) => s.id) },
    )
  }

  await prisma.$transaction([
    prisma.availabilitySlot.deleteMany({ where: { tutorId } }),
    prisma.availabilitySlot.createMany({
      data: rawSlots.map((s) => ({ tutorId, day: weekdayFromApi[s.day] as Weekday, start: s.start, end: s.end })),
    }),
  ])

  const updated = await prisma.availabilitySlot.findMany({ where: { tutorId } })
  return updated.map((a) => ({ day: weekdayToApi[a.day], start: a.start, end: a.end }))
}

export async function setTimeOff(tutorId: string, ranges: TimeOffInput[]) {
  await getTutorOr404(tutorId)
  for (const r of ranges) {
    if (r.start > r.end) throw ApiError.badRequest(`Invalid time-off range: start (${r.start}) must be before end (${r.end})`)
  }

  const sessions = await findUpcomingSessions(tutorId)
  const conflicted = sessions.filter((session) => ranges.some((r) => dateInRange(session.date, r.start, r.end)))
  if (conflicted.length) {
    throw ApiError.conflict(
      'This time-off range overlaps existing upcoming sessions. Cancel or reschedule them first.',
      { sessionIds: conflicted.map((s) => s.id) },
    )
  }

  await prisma.$transaction([
    prisma.timeOff.deleteMany({ where: { tutorId } }),
    prisma.timeOff.createMany({
      data: ranges.map((r) => ({ tutorId, label: r.label, start: r.start, end: r.end })),
    }),
  ])

  const updated = await prisma.timeOff.findMany({ where: { tutorId } })
  return updated.map((o) => ({ id: o.id, label: o.label, start: o.start, end: o.end }))
}
