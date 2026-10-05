import { Prisma } from '@prisma/client'
import { prisma } from '../lib/prisma'
import { ApiError } from '../utils/errors'
import {
  formatFromApi,
  formatToApi,
  gradeLevelFromApi,
  gradeLevelToApi,
  weekdayFromApi,
  weekdayToApi,
} from '../utils/mappers'

const tutorInclude = {
  user: { select: { id: true, name: true } },
  availability: true,
  timeOff: true,
  pricingTiers: true,
  reviews: {
    include: { student: { select: { name: true } } },
    orderBy: { date: 'desc' as const },
  },
} satisfies Prisma.TutorProfileInclude

type TutorWithRelations = Prisma.TutorProfileGetPayload<{ include: typeof tutorInclude }>

export function serializeTutor(t: TutorWithRelations) {
  const reviews = t.reviews.map((r) => ({
    id: r.id,
    studentName: r.student.name,
    rating: r.rating,
    comment: r.comment,
    date: r.date.toISOString().slice(0, 10),
  }))
  const reviewCount = reviews.length
  const rating = reviewCount === 0 ? 0 : Math.round((reviews.reduce((sum, r) => sum + r.rating, 0) / reviewCount) * 100) / 100

  return {
    id: t.id,
    name: t.user.name,
    photo: t.photo,
    tagline: t.tagline,
    bio: t.bio,
    education: t.education,
    certifications: t.certifications,
    subjects: t.subjects,
    gradeLevels: t.gradeLevels.map((g) => gradeLevelToApi[g]),
    hourlyRate: t.hourlyRate,
    rating,
    reviewCount,
    format: formatToApi[t.format],
    location: t.location ?? undefined,
    introVideoUrl: t.introVideoUrl ?? undefined,
    yearsExperience: t.yearsExperience,
    responseTime: t.responseTime,
    languages: t.languages,
    timezone: t.timezone,
    reviews,
    availability: t.availability.map((a) => ({ day: weekdayToApi[a.day], start: a.start, end: a.end })),
    timeOff: t.timeOff.map((o) => ({ id: o.id, label: o.label, start: o.start, end: o.end })),
    pricingTiers: t.pricingTiers.map((p) => ({ id: p.id, label: p.label, durationMins: p.durationMins, rate: p.rate })),
  }
}

export interface TutorFilters {
  search?: string
  subjects?: string[]
  gradeLevels?: string[]
  format?: 'online' | 'in-person' | 'any'
  minRating?: number
  maxRate?: number
  day?: string
  sort?: 'rating' | 'price-asc' | 'price-desc' | 'experience'
  page: number
  pageSize: number
}

export async function listTutors(filters: TutorFilters) {
  const where: Prisma.TutorProfileWhereInput = {}
  const and: Prisma.TutorProfileWhereInput[] = []

  if (filters.search) {
    and.push({
      OR: [
        { user: { name: { contains: filters.search, mode: 'insensitive' } } },
        { tagline: { contains: filters.search, mode: 'insensitive' } },
        { subjects: { has: filters.search } },
      ],
    })
  }
  if (filters.subjects?.length) {
    and.push({ subjects: { hasSome: filters.subjects } })
  }
  if (filters.gradeLevels?.length) {
    and.push({ gradeLevels: { hasSome: filters.gradeLevels.map((g) => gradeLevelFromApi[g]).filter(Boolean) } })
  }
  if (filters.format && filters.format !== 'any') {
    and.push({ OR: [{ format: formatFromApi[filters.format] }, { format: 'BOTH' }] })
  }
  if (filters.minRating !== undefined) {
    // rating is derived, so filter in-memory after fetch (dataset-scale tradeoff noted in README)
  }
  if (filters.maxRate !== undefined) {
    and.push({ hourlyRate: { lte: filters.maxRate } })
  }
  if (filters.day && weekdayFromApi[filters.day]) {
    and.push({ availability: { some: { day: weekdayFromApi[filters.day] } } })
  }
  if (and.length) where.AND = and

  const orderBy: Prisma.TutorProfileOrderByWithRelationInput =
    filters.sort === 'price-asc'
      ? { hourlyRate: 'asc' }
      : filters.sort === 'price-desc'
        ? { hourlyRate: 'desc' }
        : filters.sort === 'experience'
          ? { yearsExperience: 'desc' }
          : { createdAt: 'desc' } // 'rating' is derived; applied in-memory below

  let tutors = await prisma.tutorProfile.findMany({ where, include: tutorInclude, orderBy })
  let serialized = tutors.map(serializeTutor)

  if (filters.minRating !== undefined) {
    serialized = serialized.filter((t) => t.rating >= filters.minRating!)
  }
  if (filters.sort === 'rating') {
    serialized = serialized.sort((a, b) => b.rating - a.rating)
  }

  const total = serialized.length
  const start = (filters.page - 1) * filters.pageSize
  const page = serialized.slice(start, start + filters.pageSize)

  return { tutors: page, total, page: filters.page, pageSize: filters.pageSize }
}

export async function getTutorById(id: string) {
  const tutor = await prisma.tutorProfile.findUnique({ where: { id }, include: tutorInclude })
  if (!tutor) throw ApiError.notFound('Tutor not found')
  return serializeTutor(tutor)
}

export async function getTutorOr404(id: string) {
  const tutor = await prisma.tutorProfile.findUnique({ where: { id } })
  if (!tutor) throw ApiError.notFound('Tutor not found')
  return tutor
}

export interface TutorProfileUpdate {
  tagline?: string
  bio?: string
  hourlyRate?: number
  format?: 'online' | 'in-person' | 'both'
  education?: string[]
  certifications?: string[]
  subjects?: string[]
  pricingTiers?: { id?: string; label: string; durationMins: number; rate: number }[]
  introVideoUrl?: string
  location?: string
  languages?: string[]
  gradeLevels?: string[]
  yearsExperience?: number
  responseTime?: string
  timezone?: string
}

export async function updateTutorProfile(id: string, updates: TutorProfileUpdate) {
  await getTutorOr404(id)

  await prisma.$transaction(async (tx) => {
    await tx.tutorProfile.update({
      where: { id },
      data: {
        tagline: updates.tagline,
        bio: updates.bio,
        hourlyRate: updates.hourlyRate,
        format: updates.format ? formatFromApi[updates.format] : undefined,
        education: updates.education,
        certifications: updates.certifications,
        subjects: updates.subjects,
        introVideoUrl: updates.introVideoUrl,
        location: updates.location,
        languages: updates.languages,
        gradeLevels: updates.gradeLevels ? updates.gradeLevels.map((g) => gradeLevelFromApi[g]).filter(Boolean) : undefined,
        yearsExperience: updates.yearsExperience,
        responseTime: updates.responseTime,
        timezone: updates.timezone,
      },
    })

    if (updates.pricingTiers) {
      await tx.pricingTier.deleteMany({ where: { tutorId: id } })
      if (updates.pricingTiers.length) {
        await tx.pricingTier.createMany({
          data: updates.pricingTiers.map((p) => ({ tutorId: id, label: p.label, durationMins: p.durationMins, rate: p.rate })),
        })
      }
    }
  })

  return getTutorById(id)
}

export async function setPhoto(id: string, url: string) {
  await getTutorOr404(id)
  await prisma.tutorProfile.update({ where: { id }, data: { photo: url } })
  return getTutorById(id)
}

export async function listSubjects() {
  const tutors = await prisma.tutorProfile.findMany({ select: { subjects: true } })
  const set = new Set<string>()
  for (const t of tutors) for (const s of t.subjects) set.add(s)
  return Array.from(set).sort()
}
