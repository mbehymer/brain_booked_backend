import { GradeLevel, Role, SessionFormat, SessionStatus, TeachingFormat, Weekday } from '@prisma/client'

// The front-end (src/types.ts) uses lowercase/kebab/Capitalized string unions.
// Prisma enums must be valid identifiers, so we store SCREAMING_SNAKE_CASE in
// the DB and translate at the API boundary so responses match the front-end's
// existing contract exactly.

export const formatToApi: Record<TeachingFormat, 'online' | 'in-person' | 'both'> = {
  ONLINE: 'online',
  IN_PERSON: 'in-person',
  BOTH: 'both',
}
export const formatFromApi: Record<'online' | 'in-person' | 'both', TeachingFormat> = {
  online: 'ONLINE',
  'in-person': 'IN_PERSON',
  both: 'BOTH',
}

export const sessionFormatToApi: Record<SessionFormat, 'online' | 'in-person'> = {
  ONLINE: 'online',
  IN_PERSON: 'in-person',
}
export const sessionFormatFromApi: Record<'online' | 'in-person', SessionFormat> = {
  online: 'ONLINE',
  'in-person': 'IN_PERSON',
}

export const statusToApi: Record<SessionStatus, 'upcoming' | 'completed' | 'cancelled'> = {
  UPCOMING: 'upcoming',
  COMPLETED: 'completed',
  CANCELLED: 'cancelled',
}
export const statusFromApi: Record<'upcoming' | 'completed' | 'cancelled', SessionStatus> = {
  upcoming: 'UPCOMING',
  completed: 'COMPLETED',
  cancelled: 'CANCELLED',
}

export const gradeLevelToApi: Record<GradeLevel, string> = {
  ELEMENTARY: 'Elementary',
  MIDDLE_SCHOOL: 'Middle School',
  HIGH_SCHOOL: 'High School',
  COLLEGE: 'College',
  ADULT: 'Adult',
}
export const gradeLevelFromApi: Record<string, GradeLevel> = {
  Elementary: 'ELEMENTARY',
  'Middle School': 'MIDDLE_SCHOOL',
  'High School': 'HIGH_SCHOOL',
  College: 'COLLEGE',
  Adult: 'ADULT',
}

export const weekdayToApi: Record<Weekday, string> = {
  MON: 'Mon',
  TUE: 'Tue',
  WED: 'Wed',
  THU: 'Thu',
  FRI: 'Fri',
  SAT: 'Sat',
  SUN: 'Sun',
}
export const weekdayFromApi: Record<string, Weekday> = {
  Mon: 'MON',
  Tue: 'TUE',
  Wed: 'WED',
  Thu: 'THU',
  Fri: 'FRI',
  Sat: 'SAT',
  Sun: 'SUN',
}
// JS Date#getDay(): 0 = Sunday .. 6 = Saturday
export const jsDayToWeekday: Weekday[] = ['SUN', 'MON', 'TUE', 'WED', 'THU', 'FRI', 'SAT']

export const roleToApi: Record<Role, 'student' | 'tutor'> = {
  STUDENT: 'student',
  TUTOR: 'tutor',
}
export const roleFromApi: Record<'student' | 'tutor', Role> = {
  student: 'STUDENT',
  tutor: 'TUTOR',
}
