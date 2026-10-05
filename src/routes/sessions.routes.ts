import { Router } from 'express'
import { z } from 'zod'
import { requireAuth, requireRole } from '../middleware/auth'
import { uploadHomeworkFile } from '../middleware/upload'
import { ApiError } from '../utils/errors'
import { env } from '../config/env'
import path from 'node:path'
import {
  bookSession,
  listSessions,
  updateSessionNotes,
  updateSessionStatus,
} from '../services/session.service'
import { addHomework, addHomeworkFeedback, getHomeworkFileForDownload } from '../services/homework.service'

export const sessionsRouter = Router()
sessionsRouter.use(requireAuth)

const bookingSchema = z.object({
  tutorId: z.string(),
  subject: z.string().min(1),
  date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
  time: z.string().regex(/^\d{2}:\d{2}$/),
  durationMins: z.number().int().positive(),
  format: z.enum(['online', 'in-person']),
})

sessionsRouter.post('/', requireRole('STUDENT'), async (req, res, next) => {
  try {
    const input = bookingSchema.parse(req.body)
    res.status(201).json(await bookSession(req.user!.id, input))
  } catch (err) {
    next(err)
  }
})

const listSchema = z.object({
  status: z.enum(['upcoming', 'completed', 'cancelled']).optional(),
})

sessionsRouter.get('/', async (req, res, next) => {
  try {
    const q = listSchema.parse(req.query)
    res.json(await listSessions(req.user!, q.status))
  } catch (err) {
    next(err)
  }
})

const statusSchema = z.object({ status: z.enum(['cancelled', 'completed']) })

sessionsRouter.patch('/:id', async (req, res, next) => {
  try {
    const input = statusSchema.parse(req.body)
    res.json(await updateSessionStatus(req.params.id as string, req.user!, input.status))
  } catch (err) {
    next(err)
  }
})

const notesSchema = z.object({ notes: z.string() })

sessionsRouter.patch('/:id/notes', requireRole('TUTOR'), async (req, res, next) => {
  try {
    const input = notesSchema.parse(req.body)
    res.json(await updateSessionNotes(req.params.id as string, req.user!, input.notes))
  } catch (err) {
    next(err)
  }
})

sessionsRouter.post('/:id/homework', requireRole('STUDENT'), uploadHomeworkFile.single('file'), async (req, res, next) => {
  try {
    if (!req.file) throw ApiError.badRequest('No file provided')
    res.status(201).json(await addHomework(req.params.id as string, req.user!, req.file))
  } catch (err) {
    next(err)
  }
})

const feedbackSchema = z.object({ feedback: z.string().min(1) })

sessionsRouter.patch('/:id/homework/:homeworkId', requireRole('TUTOR'), async (req, res, next) => {
  try {
    const input = feedbackSchema.parse(req.body)
    res.json(await addHomeworkFeedback(req.params.id as string, req.params.homeworkId as string, req.user!, input.feedback))
  } catch (err) {
    next(err)
  }
})

sessionsRouter.get('/:id/homework/:homeworkId/file', async (req, res, next) => {
  try {
    const homework = await getHomeworkFileForDownload(req.params.id as string, req.params.homeworkId as string, req.user!)
    const absolutePath = path.join(process.cwd(), env.uploadDir, homework.filePath)
    res.download(absolutePath, homework.fileName)
  } catch (err) {
    next(err)
  }
})
