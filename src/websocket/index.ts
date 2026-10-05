import { Server as HttpServer } from 'node:http'
import { Server as SocketServer, Socket } from 'socket.io'
import { env } from '../config/env'
import { verifyToken } from '../utils/jwt'
import { prisma } from '../lib/prisma'

let io: SocketServer | undefined

function parseCookie(header: string | undefined, name: string): string | undefined {
  if (!header) return undefined
  for (const part of header.split(';')) {
    const [key, ...rest] = part.trim().split('=')
    if (key === name) return decodeURIComponent(rest.join('='))
  }
  return undefined
}

export function initSocket(httpServer: HttpServer) {
  io = new SocketServer(httpServer, {
    cors: { origin: env.clientOrigin, credentials: true },
  })

  io.use(async (socket: Socket, next) => {
    try {
      const token = parseCookie(socket.handshake.headers.cookie, env.cookieName)
      if (!token) return next(new Error('unauthorized'))

      const payload = verifyToken(token)
      const user = await prisma.user.findUnique({
        where: { id: payload.sub },
        select: { id: true, role: true, tutorProfile: { select: { id: true } } },
      })
      if (!user) return next(new Error('unauthorized'))

      socket.data.user = { id: user.id, role: user.role, tutorId: user.tutorProfile?.id ?? null }
      next()
    } catch {
      next(new Error('unauthorized'))
    }
  })

  io.on('connection', async (socket: Socket) => {
    const user = socket.data.user as { id: string; role: 'STUDENT' | 'TUTOR'; tutorId: string | null }

    const conversations = await prisma.conversation.findMany({
      where: user.role === 'TUTOR' ? { tutorId: user.tutorId! } : { studentId: user.id },
      select: { id: true },
    })
    for (const c of conversations) socket.join(`conversation:${c.id}`)

    socket.on('conversation:join', async (conversationId: string) => {
      const conversation = await prisma.conversation.findUnique({ where: { id: conversationId } })
      if (!conversation) return
      const owns = user.role === 'TUTOR' ? conversation.tutorId === user.tutorId : conversation.studentId === user.id
      if (owns) socket.join(`conversation:${conversationId}`)
    })
  })

  return io
}

export function broadcastMessage(conversationId: string, message: unknown) {
  io?.to(`conversation:${conversationId}`).emit('message:new', message)
}
