import path from 'node:path'
import { prisma } from '../lib/prisma'
import { ApiError } from '../utils/errors'
import { getOwnedSession } from './session.service'

export interface UploadedFile {
  originalname: string
  filename: string
  mimetype: string
  size: number
}

function serializeHomework(h: { id: string; fileName: string; uploadedAt: Date; feedback: string | null }) {
  return { id: h.id, fileName: h.fileName, uploadedAt: h.uploadedAt.toISOString().slice(0, 10), feedback: h.feedback ?? undefined }
}

export async function addHomework(
  sessionId: string,
  user: { id: string; role: 'STUDENT' | 'TUTOR'; tutorId: string | null },
  file: UploadedFile,
) {
  if (user.role !== 'STUDENT') throw ApiError.forbidden('Only students upload homework')
  await getOwnedSession(sessionId, user)

  const homework = await prisma.homeworkItem.create({
    data: {
      sessionId,
      fileName: file.originalname,
      filePath: path.join('homework', file.filename),
      mimeType: file.mimetype,
      sizeBytes: file.size,
    },
  })
  return serializeHomework(homework)
}

export async function addHomeworkFeedback(
  sessionId: string,
  homeworkId: string,
  user: { id: string; role: 'STUDENT' | 'TUTOR'; tutorId: string | null },
  feedback: string,
) {
  if (user.role !== 'TUTOR') throw ApiError.forbidden('Only the tutor can add feedback')
  await getOwnedSession(sessionId, user)

  const homework = await prisma.homeworkItem.findUnique({ where: { id: homeworkId } })
  if (!homework || homework.sessionId !== sessionId) throw ApiError.notFound('Homework item not found')

  const updated = await prisma.homeworkItem.update({ where: { id: homeworkId }, data: { feedback } })
  return serializeHomework(updated)
}

export async function getHomeworkFileForDownload(
  sessionId: string,
  homeworkId: string,
  user: { id: string; role: 'STUDENT' | 'TUTOR'; tutorId: string | null },
) {
  await getOwnedSession(sessionId, user)
  const homework = await prisma.homeworkItem.findUnique({ where: { id: homeworkId } })
  if (!homework || homework.sessionId !== sessionId) throw ApiError.notFound('Homework item not found')
  return homework
}
