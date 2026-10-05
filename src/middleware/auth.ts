import { RequestHandler } from 'express'
import { Role } from '@prisma/client'
import { env } from '../config/env'
import { verifyToken } from '../utils/jwt'
import { prisma } from '../lib/prisma'
import { ApiError } from '../utils/errors'

/** Populates req.user when a valid session cookie is present; never rejects. */
export const attachUser: RequestHandler = async (req, _res, next) => {
  try {
    const token = req.cookies?.[env.cookieName]
    if (!token) return next()

    const payload = verifyToken(token)
    const user = await prisma.user.findUnique({
      where: { id: payload.sub },
      select: { id: true, role: true, tutorProfile: { select: { id: true } } },
    })
    if (!user) return next()

    req.user = { id: user.id, role: user.role, tutorId: user.tutorProfile?.id ?? null }
    next()
  } catch {
    // invalid/expired token: treat as logged out rather than erroring
    next()
  }
}

export const requireAuth: RequestHandler = (req, _res, next) => {
  if (!req.user) return next(ApiError.unauthorized())
  next()
}

export function requireRole(...roles: Role[]): RequestHandler {
  return (req, _res, next) => {
    if (!req.user) return next(ApiError.unauthorized())
    if (!roles.includes(req.user.role)) return next(ApiError.forbidden())
    next()
  }
}
