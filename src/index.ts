import { createServer } from 'node:http'
import { app } from './app'
import { env } from './config/env'
import { initSocket } from './websocket'

const httpServer = createServer(app)
initSocket(httpServer)

httpServer.listen(env.port, () => {
  console.log(`BrainBooked API listening on http://localhost:${env.port}`)
})
