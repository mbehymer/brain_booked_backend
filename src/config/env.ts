import 'dotenv/config'

function required(name: string): string {
  const value = process.env[name]
  if (!value) throw new Error(`Missing required env var: ${name}`)
  return value
}

export const env = {
  nodeEnv: process.env.NODE_ENV ?? 'development',
  port: Number(process.env.PORT ?? 4000),
  databaseUrl: required('DATABASE_URL'),
  clientOrigin: process.env.CLIENT_ORIGIN ?? 'http://localhost:5173',
  jwtSecret: required('JWT_SECRET'),
  jwtExpiresIn: process.env.JWT_EXPIRES_IN ?? '7d',
  cookieName: process.env.COOKIE_NAME ?? 'bb_token',
  uploadDir: process.env.UPLOAD_DIR ?? 'uploads',
  maxPhotoSizeMb: Number(process.env.MAX_PHOTO_SIZE_MB ?? 5),
  maxHomeworkSizeMb: Number(process.env.MAX_HOMEWORK_SIZE_MB ?? 20),
}
