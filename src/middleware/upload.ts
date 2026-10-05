import multer from 'multer'
import path from 'node:path'
import crypto from 'node:crypto'
import { env } from '../config/env'

const PHOTO_TYPES = new Set(['image/jpeg', 'image/png', 'image/webp'])
const HOMEWORK_TYPES = new Set([
  'application/pdf',
  'application/msword',
  'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
  'image/jpeg',
  'image/png',
  'image/webp',
  'text/plain',
])

function storageFor(subdir: string) {
  return multer.diskStorage({
    destination: path.join(process.cwd(), env.uploadDir, subdir),
    filename: (_req, file, cb) => {
      const ext = path.extname(file.originalname)
      cb(null, `${crypto.randomUUID()}${ext}`)
    },
  })
}

export const uploadPhoto = multer({
  storage: storageFor('photos'),
  limits: { fileSize: env.maxPhotoSizeMb * 1024 * 1024 },
  fileFilter: (_req, file, cb) => {
    if (!PHOTO_TYPES.has(file.mimetype)) return cb(new Error('Unsupported image type'))
    cb(null, true)
  },
})

export const uploadHomeworkFile = multer({
  storage: storageFor('homework'),
  limits: { fileSize: env.maxHomeworkSizeMb * 1024 * 1024 },
  fileFilter: (_req, file, cb) => {
    if (!HOMEWORK_TYPES.has(file.mimetype)) return cb(new Error('Unsupported file type'))
    cb(null, true)
  },
})
