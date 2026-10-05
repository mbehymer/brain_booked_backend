import { Router } from 'express'
import { z } from 'zod'
import { requireAuth, requireRole } from '../middleware/auth'
import { getOrCreateConversation, listConversations, listMessages, postMessage } from '../services/conversation.service'
import { getTutorOr404 } from '../services/tutor.service'

export const conversationsRouter = Router()
conversationsRouter.use(requireAuth)

conversationsRouter.get('/', async (req, res, next) => {
  try {
    res.json(await listConversations(req.user!))
  } catch (err) {
    next(err)
  }
})

const createSchema = z.object({ tutorId: z.string() })

conversationsRouter.post('/', requireRole('STUDENT'), async (req, res, next) => {
  try {
    const input = createSchema.parse(req.body)
    await getTutorOr404(input.tutorId)
    const conversation = await getOrCreateConversation(req.user!.id, input.tutorId)
    res.status(201).json({ id: conversation.id })
  } catch (err) {
    next(err)
  }
})

conversationsRouter.get('/:id/messages', async (req, res, next) => {
  try {
    res.json(await listMessages(req.params.id, req.user!))
  } catch (err) {
    next(err)
  }
})

const messageSchema = z.object({ text: z.string().min(1) })

conversationsRouter.post('/:id/messages', async (req, res, next) => {
  try {
    const input = messageSchema.parse(req.body)
    res.status(201).json(await postMessage(req.params.id, req.user!, input.text))
  } catch (err) {
    next(err)
  }
})
