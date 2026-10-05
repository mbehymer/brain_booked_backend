import { Router } from 'express'
import { z } from 'zod'
import { env } from '../config/env'
import { login, signup } from '../services/auth.service'
import { requireAuth } from '../middleware/auth'
import { prisma } from '../lib/prisma'
import { roleToApi } from '../utils/mappers'
import { ApiError } from '../utils/errors'

export const authRouter = Router()

const signupSchema = z.object({
  email: z.string().email(),
  password: z.string().min(8),
  name: z.string().min(1),
  role: z.enum(['student', 'tutor']),
})

const loginSchema = z.object({
  email: z.string().email(),
  password: z.string().min(1),
})

const isProduction = env.nodeEnv === 'production'

const cookieOptions = {
  httpOnly: true,
  // Frontend and API are on different Render subdomains, which browsers treat as
  // different sites — SameSite=None (+ Secure, required alongside it) is needed for
  // the cookie to be sent on cross-site fetch calls. Lax is kept for local dev,
  // where frontend and API share localhost and SameSite=None would need HTTPS anyway.
  sameSite: (isProduction ? 'none' : 'lax') as 'none' | 'lax',
  secure: isProduction,
  maxAge: 7 * 24 * 60 * 60 * 1000,
}

authRouter.post('/signup', async (req, res, next) => {
  try {
    const input = signupSchema.parse(req.body)
    const { token, user } = await signup(input.email, input.password, input.name, input.role)
    res.cookie(env.cookieName, token, cookieOptions)
    res.status(201).json({ id: user.id, email: user.email, name: user.name, role: roleToApi[user.role], tutorId: user.tutorProfile?.id ?? null })
  } catch (err) {
    next(err)
  }
})

authRouter.post('/login', async (req, res, next) => {
  try {
    const input = loginSchema.parse(req.body)
    const { token, user } = await login(input.email, input.password)
    res.cookie(env.cookieName, token, cookieOptions)
    res.json({ id: user.id, email: user.email, name: user.name, role: roleToApi[user.role], tutorId: user.tutorProfile?.id ?? null })
  } catch (err) {
    next(err)
  }
})

authRouter.post('/logout', (_req, res) => {
  res.clearCookie(env.cookieName, cookieOptions)
  res.status(204).send()
})

export const meRouter = Router()

meRouter.get('/', requireAuth, async (req, res, next) => {
  try {
    const user = await prisma.user.findUnique({
      where: { id: req.user!.id },
      select: { id: true, email: true, name: true, role: true },
    })
    if (!user) throw ApiError.unauthorized()
    res.json({ id: user.id, email: user.email, name: user.name, role: roleToApi[user.role], tutorId: req.user!.tutorId })
  } catch (err) {
    next(err)
  }
})
