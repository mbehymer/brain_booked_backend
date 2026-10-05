import { prisma } from '../lib/prisma'
import { ApiError } from '../utils/errors'
import { roleToApi } from '../utils/mappers'
import { broadcastMessage } from '../websocket'

function serializeMessage(m: { id: string; conversationId: string; senderRole: 'STUDENT' | 'TUTOR'; text: string; timestamp: Date }, tutorId: string) {
  return {
    id: m.id,
    tutorId,
    sender: roleToApi[m.senderRole],
    text: m.text,
    timestamp: m.timestamp.toISOString(),
  }
}

export async function getOrCreateConversation(studentId: string, tutorId: string) {
  return prisma.conversation.upsert({
    where: { studentId_tutorId: { studentId, tutorId } },
    create: { studentId, tutorId },
    update: {},
  })
}

export async function listConversations(user: { id: string; role: 'STUDENT' | 'TUTOR'; tutorId: string | null }) {
  const where = user.role === 'TUTOR' ? { tutorId: user.tutorId! } : { studentId: user.id }
  const conversations = await prisma.conversation.findMany({
    where,
    include: {
      student: { select: { id: true, name: true } },
      tutor: { select: { id: true, user: { select: { name: true, id: true } }, photo: true } },
      messages: { orderBy: { timestamp: 'desc' as const }, take: 1 },
    },
    orderBy: { createdAt: 'desc' },
  })

  return conversations.map((c) => ({
    id: c.id,
    tutorId: c.tutorId,
    tutorName: c.tutor.user.name,
    tutorPhoto: c.tutor.photo,
    studentId: c.studentId,
    studentName: c.student.name,
    lastMessage: c.messages[0]
      ? { text: c.messages[0].text, timestamp: c.messages[0].timestamp.toISOString(), sender: roleToApi[c.messages[0].senderRole] }
      : null,
  }))
}

async function getOwnedConversation(conversationId: string, user: { id: string; role: 'STUDENT' | 'TUTOR'; tutorId: string | null }) {
  const conversation = await prisma.conversation.findUnique({ where: { id: conversationId } })
  if (!conversation) throw ApiError.notFound('Conversation not found')
  const owns = user.role === 'TUTOR' ? conversation.tutorId === user.tutorId : conversation.studentId === user.id
  if (!owns) throw ApiError.forbidden()
  return conversation
}

export async function listMessages(conversationId: string, user: { id: string; role: 'STUDENT' | 'TUTOR'; tutorId: string | null }) {
  const conversation = await getOwnedConversation(conversationId, user)
  const messages = await prisma.message.findMany({ where: { conversationId }, orderBy: { timestamp: 'asc' } })
  return messages.map((m) => serializeMessage(m, conversation.tutorId))
}

export async function postMessage(conversationId: string, user: { id: string; role: 'STUDENT' | 'TUTOR'; tutorId: string | null }, text: string) {
  const conversation = await getOwnedConversation(conversationId, user)

  const message = await prisma.message.create({
    data: { conversationId, senderId: user.id, senderRole: user.role, text },
  })
  const serialized = serializeMessage(message, conversation.tutorId)
  broadcastMessage(conversationId, serialized)
  return serialized
}
