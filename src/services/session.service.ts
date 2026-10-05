import { prisma } from '../lib/prisma'
import { ApiError } from '../utils/errors'
import { sessionFormatFromApi, sessionFormatToApi, statusFromApi, statusToApi } from '../utils/mappers'
import { addMinutes, dateInRange, slotContainsWindow, timeRangesOverlap, toDateTime, weekdayForDate } from '../utils/time'
import { getTutorOr404 } from './tutor.service'
import { getOrCreateConversation } from './conversation.service'

function serializeSession(s: {
  id: string
  tutorId: string
  studentId: string
  student: { name: string }
  subject: string
  date: string
  time: string
  durationMins: number
  status: 'UPCOMING' | 'COMPLETED' | 'CANCELLED'
  format: 'ONLINE' | 'IN_PERSON'
  notes: string | null
  homework: { id: string; fileName: string; uploadedAt: Date; feedback: string | null }[]
}) {
  return {
    id: s.id,
    tutorId: s.tutorId,
    studentName: s.student.name,
    subject: s.subject,
    date: s.date,
    time: s.time,
    durationMins: s.durationMins,
    status: statusToApi[s.status],
    format: sessionFormatToApi[s.format],
    notes: s.notes ?? undefined,
    homework: s.homework.map((h) => ({
      id: h.id,
      fileName: h.fileName,
      uploadedAt: h.uploadedAt.toISOString().slice(0, 10),
      feedback: h.feedback ?? undefined,
    })),
  }
}

const sessionInclude = { student: { select: { name: true } }, homework: true } as const

/** Flips any UPCOMING session whose end time has passed to COMPLETED. Lazy, since there's no scheduler. */
async function autoCompletePastSessions(where: { tutorId?: string; studentId?: string }) {
  const candidates = await prisma.session.findMany({ where: { ...where, status: 'UPCOMING' } })
  const now = new Date()
  const toComplete = candidates.filter((s) => toDateTime(s.date, addMinutes(s.time, s.durationMins)) <= now)
  if (toComplete.length) {
    await prisma.session.updateMany({ where: { id: { in: toComplete.map((s) => s.id) } }, data: { status: 'COMPLETED' } })
  }
}

export interface BookingInput {
  tutorId: string
  subject: string
  date: string
  time: string
  durationMins: number
  format: 'online' | 'in-person'
}

export async function bookSession(studentId: string, input: BookingInput) {
  const tutor = await getTutorOr404(input.tutorId)

  const slots = await prisma.availabilitySlot.findMany({ where: { tutorId: tutor.id, day: weekdayForDate(input.date) } })
  const windowEnd = addMinutes(input.time, input.durationMins)
  const fits = slots.some((slot) => slotContainsWindow(slot.start, slot.end, input.time, windowEnd))
  if (!fits) throw ApiError.badRequest('Requested time is outside the tutor\'s availability')

  const timeOff = await prisma.timeOff.findMany({ where: { tutorId: tutor.id } })
  const onTimeOff = timeOff.some((o) => dateInRange(input.date, o.start, o.end))
  if (onTimeOff) throw ApiError.badRequest('Tutor is unavailable (time off) on this date')

  const sameDaySessions = await prisma.session.findMany({
    where: { tutorId: tutor.id, date: input.date, status: 'UPCOMING' },
  })
  const collides = sameDaySessions.some((s) => timeRangesOverlap(s.time, addMinutes(s.time, s.durationMins), input.time, windowEnd))
  if (collides) throw ApiError.conflict('This time slot was just booked by someone else. Please pick another.')

  const session = await prisma.session.create({
    data: {
      tutorId: tutor.id,
      studentId,
      subject: input.subject,
      date: input.date,
      time: input.time,
      durationMins: input.durationMins,
      format: sessionFormatFromApi[input.format],
    },
    include: sessionInclude,
  })

  await getOrCreateConversation(studentId, tutor.id)

  return serializeSession(session)
}

export async function listSessions(user: { id: string; role: 'STUDENT' | 'TUTOR'; tutorId: string | null }, status?: string) {
  const where: { tutorId?: string; studentId?: string } =
    user.role === 'TUTOR' ? { tutorId: user.tutorId! } : { studentId: user.id }

  await autoCompletePastSessions(where)

  const sessions = await prisma.session.findMany({
    where: { ...where, status: status ? statusFromApi[status as keyof typeof statusFromApi] : undefined },
    include: sessionInclude,
    orderBy: [{ date: 'desc' }, { time: 'desc' }],
  })
  return sessions.map(serializeSession)
}

async function getOwnedSession(sessionId: string, user: { id: string; role: 'STUDENT' | 'TUTOR'; tutorId: string | null }) {
  const session = await prisma.session.findUnique({ where: { id: sessionId }, include: sessionInclude })
  if (!session) throw ApiError.notFound('Session not found')
  const owns = user.role === 'TUTOR' ? session.tutorId === user.tutorId : session.studentId === user.id
  if (!owns) throw ApiError.forbidden()
  return session
}

export async function updateSessionStatus(
  sessionId: string,
  user: { id: string; role: 'STUDENT' | 'TUTOR'; tutorId: string | null },
  status: 'cancelled' | 'completed',
) {
  const session = await getOwnedSession(sessionId, user)
  if (session.status !== 'UPCOMING') throw ApiError.badRequest(`Cannot change status of a ${statusToApi[session.status]} session`)
  if (status === 'completed' && user.role !== 'TUTOR') throw ApiError.forbidden('Only the tutor can mark a session completed')

  const updated = await prisma.session.update({
    where: { id: sessionId },
    data: { status: statusFromApi[status] },
    include: sessionInclude,
  })
  return serializeSession(updated)
}

export async function updateSessionNotes(
  sessionId: string,
  user: { id: string; role: 'STUDENT' | 'TUTOR'; tutorId: string | null },
  notes: string,
) {
  if (user.role !== 'TUTOR') throw ApiError.forbidden('Only the tutor can edit lesson notes')
  const session = await getOwnedSession(sessionId, user)

  const updated = await prisma.session.update({ where: { id: session.id }, data: { notes }, include: sessionInclude })
  return serializeSession(updated)
}

export { getOwnedSession, serializeSession }
