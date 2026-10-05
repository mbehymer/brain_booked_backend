import express from 'express'
import cors from 'cors'
import cookieParser from 'cookie-parser'
import path from 'node:path'
import { env } from './config/env'
import { attachUser } from './middleware/auth'
import { errorHandler } from './middleware/error'
import { authRouter, meRouter } from './routes/auth.routes'
import { tutorsRouter, subjectsRouter } from './routes/tutors.routes'
import { sessionsRouter } from './routes/sessions.routes'
import { conversationsRouter } from './routes/conversations.routes'

export const app = express()

app.use(cors({ origin: env.clientOrigin, credentials: true }))
app.use(express.json())
app.use(cookieParser())
app.use(attachUser)

// Tutor photos are public assets; homework files are served via an
// authenticated download route instead (see sessions.routes.ts).
app.use(`/${env.uploadDir}/photos`, express.static(path.join(process.cwd(), env.uploadDir, 'photos')))

app.get('/health', (_req, res) => res.json({ ok: true }))

app.use('/auth', authRouter)
app.use('/me', meRouter)
app.use('/tutors', tutorsRouter)
app.use('/subjects', subjectsRouter)
app.use('/sessions', sessionsRouter)
app.use('/conversations', conversationsRouter)

app.use(errorHandler)
