import { Router } from 'express'
import { z } from 'zod'
import { requireAuth, requireRole } from '../middleware/auth'
import { uploadPhoto } from '../middleware/upload'
import { ApiError } from '../utils/errors'
import { env } from '../config/env'
import {
  getTutorById,
  listSubjects,
  listTutors,
  setPhoto,
  updateTutorProfile,
} from '../services/tutor.service'
import { setAvailability, setTimeOff } from '../services/availability.service'
import { createReview, listReviews } from '../services/review.service'

export const tutorsRouter = Router()

function requireOwnTutor(req: Parameters<import('express').RequestHandler>[0]) {
  if (!req.user?.tutorId || req.user.tutorId !== req.params.id) {
    throw ApiError.forbidden('You can only manage your own tutor profile')
  }
}

const searchSchema = z.object({
  search: z.string().optional(),
  subjects: z.union([z.string(), z.array(z.string())]).optional(),
  gradeLevels: z.union([z.string(), z.array(z.string())]).optional(),
  format: z.enum(['online', 'in-person', 'any']).optional(),
  minRating: z.coerce.number().optional(),
  maxRate: z.coerce.number().optional(),
  day: z.string().optional(),
  sort: z.enum(['rating', 'price-asc', 'price-desc', 'experience']).optional(),
  page: z.coerce.number().int().min(1).default(1),
  pageSize: z.coerce.number().int().min(1).max(100).default(20),
})

function toArray(v: string | string[] | undefined): string[] | undefined {
  if (v === undefined) return undefined
  return Array.isArray(v) ? v : [v]
}

tutorsRouter.get('/', async (req, res, next) => {
  try {
    const q = searchSchema.parse(req.query)
    const result = await listTutors({
      search: q.search,
      subjects: toArray(q.subjects),
      gradeLevels: toArray(q.gradeLevels),
      format: q.format,
      minRating: q.minRating,
      maxRate: q.maxRate,
      day: q.day,
      sort: q.sort,
      page: q.page,
      pageSize: q.pageSize,
    })
    res.json(result)
  } catch (err) {
    next(err)
  }
})

tutorsRouter.get('/:id', async (req, res, next) => {
  try {
    res.json(await getTutorById(req.params.id))
  } catch (err) {
    next(err)
  }
})

tutorsRouter.get('/:id/reviews', async (req, res, next) => {
  try {
    res.json(await listReviews(req.params.id))
  } catch (err) {
    next(err)
  }
})

const reviewSchema = z.object({
  rating: z.number().int().min(1).max(5),
  comment: z.string().min(1),
})

tutorsRouter.post('/:id/reviews', requireAuth, requireRole('STUDENT'), async (req, res, next) => {
  try {
    const input = reviewSchema.parse(req.body)
    const tutor = await createReview(req.params.id as string, req.user!.id, input.rating, input.comment)
    res.status(201).json(tutor)
  } catch (err) {
    next(err)
  }
})

const profileUpdateSchema = z.object({
  tagline: z.string().optional(),
  bio: z.string().optional(),
  hourlyRate: z.number().min(0).optional(),
  format: z.enum(['online', 'in-person', 'both']).optional(),
  education: z.array(z.string()).optional(),
  certifications: z.array(z.string()).optional(),
  subjects: z.array(z.string()).optional(),
  pricingTiers: z.array(z.object({ id: z.string().optional(), label: z.string(), durationMins: z.number().int().positive(), rate: z.number().min(0) })).optional(),
  introVideoUrl: z.string().url().optional(),
  location: z.string().optional(),
  languages: z.array(z.string()).optional(),
  gradeLevels: z.array(z.string()).optional(),
  yearsExperience: z.number().int().min(0).optional(),
  responseTime: z.string().optional(),
  timezone: z.string().optional(),
})

tutorsRouter.patch('/:id', requireAuth, requireRole('TUTOR'), async (req, res, next) => {
  try {
    requireOwnTutor(req)
    const updates = profileUpdateSchema.parse(req.body)
    res.json(await updateTutorProfile(req.params.id as string, updates))
  } catch (err) {
    next(err)
  }
})

const availabilitySchema = z.array(
  z.object({
    day: z.enum(['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun']),
    start: z.string().regex(/^\d{2}:\d{2}$/),
    end: z.string().regex(/^\d{2}:\d{2}$/),
  }),
)

tutorsRouter.put('/:id/availability', requireAuth, requireRole('TUTOR'), async (req, res, next) => {
  try {
    requireOwnTutor(req)
    const slots = availabilitySchema.parse(req.body)
    res.json(await setAvailability(req.params.id as string, slots))
  } catch (err) {
    next(err)
  }
})

const timeOffSchema = z.array(
  z.object({
    id: z.string().optional(),
    label: z.string().min(1),
    start: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
    end: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
  }),
)

tutorsRouter.put('/:id/time-off', requireAuth, requireRole('TUTOR'), async (req, res, next) => {
  try {
    requireOwnTutor(req)
    const ranges = timeOffSchema.parse(req.body)
    res.json(await setTimeOff(req.params.id as string, ranges))
  } catch (err) {
    next(err)
  }
})

tutorsRouter.post('/:id/photo', requireAuth, requireRole('TUTOR'), uploadPhoto.single('photo'), async (req, res, next) => {
  try {
    requireOwnTutor(req)
    if (!req.file) throw ApiError.badRequest('No photo file provided')
    const url = `${req.protocol}://${req.get('host')}/${env.uploadDir}/photos/${req.file.filename}`
    res.json(await setPhoto(req.params.id as string, url))
  } catch (err) {
    next(err)
  }
})

export const subjectsRouter = Router()
subjectsRouter.get('/', async (_req, res, next) => {
  try {
    res.json(await listSubjects())
  } catch (err) {
    next(err)
  }
})
