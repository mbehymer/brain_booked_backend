import { ErrorRequestHandler } from 'express'
import { Prisma } from '@prisma/client'
import { ZodError } from 'zod'
import multer from 'multer'
import { ApiError } from '../utils/errors'

export const errorHandler: ErrorRequestHandler = (err, _req, res, _next) => {
  if (err instanceof ApiError) {
    res.status(err.status).json({ error: err.message, details: err.details })
    return
  }

  if (err instanceof ZodError) {
    res.status(400).json({ error: 'Invalid request', details: err.issues })
    return
  }

  if (err instanceof multer.MulterError) {
    res.status(400).json({ error: err.message })
    return
  }
  if (err instanceof Error && /unsupported (image|file) type/i.test(err.message)) {
    res.status(400).json({ error: err.message })
    return
  }

  if (err instanceof Prisma.PrismaClientKnownRequestError) {
    if (err.code === 'P2002') {
      res.status(409).json({ error: 'A record with these unique fields already exists' })
      return
    }
    if (err.code === 'P2025') {
      res.status(404).json({ error: 'Record not found' })
      return
    }
  }

  console.error(err)
  res.status(500).json({ error: 'Internal server error' })
}
