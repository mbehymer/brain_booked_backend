import bcrypt from 'bcryptjs'
import { prisma } from '../lib/prisma'
import { ApiError } from '../utils/errors'
import { roleFromApi } from '../utils/mappers'
import { signToken } from '../utils/jwt'

export async function signup(email: string, password: string, name: string, role: 'student' | 'tutor') {
  const existing = await prisma.user.findUnique({ where: { email } })
  if (existing) throw ApiError.conflict('An account with this email already exists')

  const passwordHash = await bcrypt.hash(password, 10)
  const user = await prisma.user.create({
    data: {
      email,
      passwordHash,
      name,
      role: roleFromApi[role],
      tutorProfile: role === 'tutor' ? { create: {} } : undefined,
    },
    include: { tutorProfile: { select: { id: true } } },
  })

  const token = signToken({ sub: user.id, role: user.role })
  return { token, user }
}

export async function login(email: string, password: string) {
  const user = await prisma.user.findUnique({
    where: { email },
    include: { tutorProfile: { select: { id: true } } },
  })
  if (!user) throw ApiError.unauthorized('Invalid email or password')

  const valid = await bcrypt.compare(password, user.passwordHash)
  if (!valid) throw ApiError.unauthorized('Invalid email or password')

  const token = signToken({ sub: user.id, role: user.role })
  return { token, user }
}
