import { prisma } from '../lib/prisma'
import { ApiError } from '../utils/errors'
import { getTutorById, getTutorOr404, serializeTutor } from './tutor.service'

export async function createReview(tutorId: string, studentId: string, rating: number, comment: string) {
  await getTutorOr404(tutorId)

  if (rating < 1 || rating > 5) throw ApiError.badRequest('Rating must be between 1 and 5')

  const existing = await prisma.review.findUnique({ where: { tutorId_studentId: { tutorId, studentId } } })
  if (existing) throw ApiError.conflict('You have already reviewed this tutor')

  const completedSession = await prisma.session.findFirst({
    where: { tutorId, studentId, status: 'COMPLETED' },
    orderBy: { date: 'desc' },
  })
  if (!completedSession) throw ApiError.forbidden('You can only review a tutor after completing a session with them')

  await prisma.review.create({
    data: { tutorId, studentId, rating, comment, sessionId: completedSession.id },
  })

  const tutorInclude = {
    user: { select: { id: true, name: true } },
    availability: true,
    timeOff: true,
    pricingTiers: true,
    reviews: { include: { student: { select: { name: true } } }, orderBy: { date: 'desc' as const } },
  }
  const tutor = await prisma.tutorProfile.findUniqueOrThrow({ where: { id: tutorId }, include: tutorInclude })
  return serializeTutor(tutor)
}

export async function listReviews(tutorId: string) {
  const tutor = await getTutorById(tutorId)
  return tutor.reviews
}
