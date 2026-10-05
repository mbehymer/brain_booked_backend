import { PrismaClient } from '@prisma/client'
import bcrypt from 'bcryptjs'
import { formatFromApi, gradeLevelFromApi, sessionFormatFromApi, statusFromApi, weekdayFromApi } from '../src/utils/mappers'

const prisma = new PrismaClient()

const DEMO_PASSWORD = 'password123'

const tutorSeeds = [
  {
    key: 't1',
    name: 'Maria Chen',
    email: 'maria.chen@brainbooked.dev',
    tagline: 'Calculus & Physics specialist, ex-aerospace engineer',
    bio: 'I spent six years as an aerospace engineer before moving into full-time tutoring. I love showing students that math and physics are tools for understanding the world, not just symbols on a page. My sessions are problem-first: we build intuition before we build formulas.',
    education: ['M.S. Aerospace Engineering, Georgia Tech', 'B.S. Physics, UCLA'],
    certifications: ['Certified AP Physics Reader', 'State Teaching License (CA)'],
    subjects: ['Calculus', 'Physics', 'Algebra II', 'SAT Math'],
    gradeLevels: ['High School', 'College'],
    hourlyRate: 65,
    format: 'both' as const,
    location: 'Austin, TX',
    introVideoUrl: 'https://www.youtube.com/embed/M7lc1UVf-VE',
    yearsExperience: 9,
    responseTime: 'Usually responds within an hour',
    languages: ['English', 'Mandarin'],
    timezone: 'America/Chicago',
    reviews: [
      { studentName: 'Jordan P.', rating: 5, comment: 'Maria turned calculus from my worst subject into my best. Patient and incredibly clear.', date: '2026-08-14' },
      { studentName: 'Ava S.', rating: 5, comment: 'Helped my son raise his AP Physics score from a 3 to a 5.', date: '2026-07-02' },
      { studentName: 'Liam T.', rating: 4, comment: 'Great tutor, sometimes sessions run a little over but worth it.', date: '2026-05-21' },
    ],
    availability: [
      { day: 'Mon', start: '15:00', end: '19:00' },
      { day: 'Wed', start: '15:00', end: '19:00' },
      { day: 'Sat', start: '09:00', end: '13:00' },
    ],
    timeOff: [{ label: 'Family vacation', start: '2026-11-20', end: '2026-11-28' }],
    pricingTiers: [
      { label: 'Single session', durationMins: 60, rate: 65 },
      { label: '5-session pack', durationMins: 60, rate: 60 },
      { label: 'Quick review', durationMins: 30, rate: 35 },
    ],
  },
  {
    key: 't2',
    name: 'Daniel Okafor',
    email: 'daniel.okafor@brainbooked.dev',
    tagline: 'Patient, encouraging reading & writing coach for younger learners',
    bio: 'Former elementary school teacher with a passion for helping kids fall in love with reading. I specialize in building foundational literacy skills and confidence in writing through storytelling and games.',
    education: ['B.A. Elementary Education, University of Michigan'],
    certifications: ['Orton-Gillingham Certified', 'State Teaching License (MI)'],
    subjects: ['Reading', 'Writing', 'Phonics', 'Grammar'],
    gradeLevels: ['Elementary', 'Middle School'],
    hourlyRate: 40,
    format: 'online' as const,
    yearsExperience: 7,
    responseTime: 'Usually responds within 2 hours',
    languages: ['English'],
    timezone: 'America/Detroit',
    reviews: [
      { studentName: 'Priya N.', rating: 5, comment: 'My daughter actually asks to do her reading homework now!', date: '2026-09-01' },
      { studentName: 'Sam K.', rating: 5, comment: 'Wonderful with kids who have learning differences.', date: '2026-06-18' },
    ],
    availability: [
      { day: 'Tue', start: '16:00', end: '20:00' },
      { day: 'Thu', start: '16:00', end: '20:00' },
      { day: 'Sun', start: '10:00', end: '14:00' },
    ],
    timeOff: [],
    pricingTiers: [
      { label: 'Single session', durationMins: 45, rate: 40 },
      { label: '10-session pack', durationMins: 45, rate: 35 },
    ],
  },
  {
    key: 't3',
    name: 'Sofia Ramirez',
    email: 'sofia.ramirez@brainbooked.dev',
    tagline: 'AP Chemistry & Biology tutor, med school bound',
    bio: "Currently a second-year med student who tutored throughout undergrad. I focus on building strong fundamentals so chemistry and biology click instead of feeling memorized. I know exactly what admissions committees and AP exams are looking for.",
    education: ['M.D. Candidate, Baylor College of Medicine', 'B.S. Biochemistry, Rice University'],
    certifications: [],
    subjects: ['Chemistry', 'Biology', 'AP Chemistry', 'AP Biology', 'MCAT Prep'],
    gradeLevels: ['High School', 'College', 'Adult'],
    hourlyRate: 55,
    format: 'online' as const,
    yearsExperience: 5,
    responseTime: 'Usually responds within 3 hours',
    languages: ['English', 'Spanish'],
    timezone: 'America/Chicago',
    reviews: [
      { studentName: 'Noah W.', rating: 5, comment: 'Explained organic chemistry mechanisms better than my professor.', date: '2026-08-29' },
      { studentName: 'Grace L.', rating: 5, comment: 'Got a 5 on AP Chem thanks to Sofia.', date: '2026-05-11' },
    ],
    availability: [
      { day: 'Mon', start: '18:00', end: '21:00' },
      { day: 'Wed', start: '18:00', end: '21:00' },
      { day: 'Fri', start: '17:00', end: '20:00' },
    ],
    timeOff: [{ label: 'Board exam studying', start: '2026-12-01', end: '2026-12-10' }],
    pricingTiers: [{ label: 'Single session', durationMins: 60, rate: 55 }],
  },
  {
    key: 't4',
    name: 'James Whitfield',
    email: 'james.whitfield@brainbooked.dev',
    tagline: 'Test prep veteran — SAT, ACT, and GRE',
    bio: "I've helped over 400 students raise their standardized test scores over the past 12 years. My approach blends content review with test-taking strategy, timing drills, and mindset coaching for test-day confidence.",
    education: ['M.A. Education, Columbia University', 'B.A. English, NYU'],
    certifications: ['Official SAT Course Instructor'],
    subjects: ['SAT', 'ACT', 'GRE', 'Essay Writing'],
    gradeLevels: ['High School', 'College', 'Adult'],
    hourlyRate: 90,
    format: 'both' as const,
    location: 'New York, NY',
    introVideoUrl: 'https://www.youtube.com/embed/M7lc1UVf-VE',
    yearsExperience: 12,
    responseTime: 'Usually responds within 30 minutes',
    languages: ['English'],
    timezone: 'America/New_York',
    reviews: [
      { studentName: 'Emily R.', rating: 5, comment: 'Raised my SAT score by 220 points over 3 months.', date: '2026-09-10' },
      { studentName: 'Carlos D.', rating: 4, comment: 'Expensive but the strategy sessions were worth it.', date: '2026-07-22' },
      { studentName: 'Hannah B.', rating: 5, comment: 'Best GRE tutor I found, very structured plan.', date: '2026-04-15' },
    ],
    availability: [
      { day: 'Tue', start: '08:00', end: '12:00' },
      { day: 'Thu', start: '08:00', end: '12:00' },
      { day: 'Sat', start: '10:00', end: '16:00' },
    ],
    timeOff: [],
    pricingTiers: [
      { label: 'Single session', durationMins: 60, rate: 90 },
      { label: 'Full prep package (8 sessions)', durationMins: 60, rate: 80 },
    ],
  },
  {
    key: 't5',
    name: 'Aiko Tanaka',
    email: 'aiko.tanaka@brainbooked.dev',
    tagline: 'Conversational & academic Japanese, JLPT prep',
    bio: 'Native Japanese speaker with a background in language pedagogy. I teach practical conversation alongside grammar fundamentals, tailored to whether you want to travel, work, or pass the JLPT.',
    education: ['M.A. Applied Linguistics, Waseda University'],
    certifications: ['JLPT N1', 'TESOL Certified'],
    subjects: ['Japanese', 'JLPT Prep', 'Conversational Japanese'],
    gradeLevels: ['Middle School', 'High School', 'College', 'Adult'],
    hourlyRate: 35,
    format: 'online' as const,
    yearsExperience: 6,
    responseTime: 'Usually responds within 4 hours',
    languages: ['Japanese', 'English'],
    timezone: 'America/Los_Angeles',
    reviews: [
      { studentName: 'Ben F.', rating: 5, comment: 'Passed JLPT N3 after 4 months with Aiko.', date: '2026-06-30' },
      { studentName: 'Lucy M.', rating: 5, comment: 'So encouraging and fun, never feels like a chore.', date: '2026-03-19' },
    ],
    availability: [
      { day: 'Mon', start: '07:00', end: '10:00' },
      { day: 'Tue', start: '07:00', end: '10:00' },
      { day: 'Wed', start: '07:00', end: '10:00' },
    ],
    timeOff: [],
    pricingTiers: [{ label: 'Single session', durationMins: 50, rate: 35 }],
  },
  {
    key: 't6',
    name: 'Marcus Bell',
    email: 'marcus.bell@brainbooked.dev',
    tagline: 'Coding mentor — Python, Java, and intro CS',
    bio: 'Software engineer by day, coding mentor by night. I teach programming fundamentals through building real, small projects rather than abstract exercises. Great for beginners and students prepping for AP CS.',
    education: ['B.S. Computer Science, University of Washington'],
    certifications: [],
    subjects: ['Python', 'Java', 'AP Computer Science', 'Web Development'],
    gradeLevels: ['Middle School', 'High School', 'College', 'Adult'],
    hourlyRate: 50,
    format: 'online' as const,
    yearsExperience: 4,
    responseTime: 'Usually responds within a few hours',
    languages: ['English'],
    timezone: 'America/Los_Angeles',
    reviews: [
      { studentName: 'Tyler O.', rating: 5, comment: 'Built my first real app in his class, super practical.', date: '2026-08-02' },
      { studentName: 'Nina P.', rating: 4, comment: 'Knowledgeable, sessions can run a bit fast-paced.', date: '2026-05-27' },
    ],
    availability: [
      { day: 'Wed', start: '19:00', end: '22:00' },
      { day: 'Fri', start: '19:00', end: '22:00' },
      { day: 'Sun', start: '14:00', end: '18:00' },
    ],
    timeOff: [],
    pricingTiers: [{ label: 'Single session', durationMins: 60, rate: 50 }],
  },
  {
    key: 't7',
    name: 'Priya Subramaniam',
    email: 'priya.subramaniam@brainbooked.dev',
    tagline: 'Elementary & middle school math, in-person in Seattle',
    bio: "I believe every kid can love math once it's taught at the right pace. I use manipulatives, games, and real-world examples to build number sense from the ground up, specializing in in-person sessions around Seattle.",
    education: ['B.S. Mathematics Education, University of Washington'],
    certifications: ['State Teaching License (WA)'],
    subjects: ['Elementary Math', 'Pre-Algebra', 'Middle School Math'],
    gradeLevels: ['Elementary', 'Middle School'],
    hourlyRate: 45,
    format: 'in-person' as const,
    location: 'Seattle, WA',
    yearsExperience: 8,
    responseTime: 'Usually responds within an hour',
    languages: ['English', 'Tamil'],
    timezone: 'America/Los_Angeles',
    reviews: [
      { studentName: 'Owen T.', rating: 5, comment: 'My son went from a C to an A in one semester.', date: '2026-07-18' },
      { studentName: 'Maya R.', rating: 5, comment: 'Patient and so good with anxious learners.', date: '2026-04-09' },
    ],
    availability: [
      { day: 'Mon', start: '14:00', end: '18:00' },
      { day: 'Thu', start: '14:00', end: '18:00' },
    ],
    timeOff: [{ label: 'Winter break', start: '2026-12-20', end: '2027-01-02' }],
    pricingTiers: [{ label: 'Single session', durationMins: 45, rate: 45 }],
  },
  {
    key: 't8',
    name: 'Ethan Brooks',
    email: 'ethan.brooks@brainbooked.dev',
    tagline: 'History & social studies, essay writing coach',
    bio: 'History should feel like storytelling, not memorization. I help students build arguments, structure essays, and think critically about primary sources — skills that carry well beyond the classroom.',
    education: ['M.A. History, University of Chicago', 'B.A. History, Boston College'],
    certifications: [],
    subjects: ['World History', 'US History', 'AP US History', 'Essay Writing'],
    gradeLevels: ['Middle School', 'High School'],
    hourlyRate: 48,
    format: 'both' as const,
    location: 'Chicago, IL',
    yearsExperience: 10,
    responseTime: 'Usually responds within a day',
    languages: ['English'],
    timezone: 'America/Chicago',
    reviews: [
      { studentName: 'Isla G.', rating: 5, comment: 'Helped me structure my DBQ essays so much better.', date: '2026-03-02' },
      { studentName: 'Ryan C.', rating: 4, comment: 'Great depth of knowledge, scheduling took a bit of back and forth.', date: '2026-01-14' },
    ],
    availability: [
      { day: 'Tue', start: '17:00', end: '20:00' },
      { day: 'Sat', start: '11:00', end: '15:00' },
    ],
    timeOff: [],
    pricingTiers: [{ label: 'Single session', durationMins: 60, rate: 48 }],
  },
]

const sessionSeeds = [
  { key: 's1', tutorKey: 't1', subject: 'Calculus', date: '2026-10-05', time: '16:00', durationMins: 60, status: 'upcoming' as const, format: 'online' as const, homework: [] as { fileName: string; uploadedAt: string; feedback?: string }[] },
  {
    key: 's2', tutorKey: 't4', subject: 'SAT Math', date: '2026-10-08', time: '09:00', durationMins: 60, status: 'upcoming' as const, format: 'online' as const,
    homework: [{ fileName: 'practice-test-3-answers.pdf', uploadedAt: '2026-09-29' }],
  },
  {
    key: 's3', tutorKey: 't1', subject: 'Physics', date: '2026-09-24', time: '16:00', durationMins: 60, status: 'completed' as const, format: 'online' as const,
    notes: 'Covered projectile motion and reviewed free-body diagrams. Practice problems 4-12 assigned for next week. Great improvement on identifying forces!',
    homework: [{ fileName: 'chapter-6-worksheet.pdf', uploadedAt: '2026-09-23', feedback: 'Nice work — double check your sign conventions on #7.' }],
  },
  {
    key: 's4', tutorKey: 't3', subject: 'AP Chemistry', date: '2026-09-17', time: '18:00', durationMins: 60, status: 'completed' as const, format: 'online' as const,
    notes: 'Reviewed stoichiometry and limiting reactants. Student is ready to move on to thermochemistry next session.',
    homework: [],
  },
  { key: 's5', tutorKey: 't4', subject: 'SAT Math', date: '2026-09-10', time: '09:00', durationMins: 60, status: 'cancelled' as const, format: 'online' as const, homework: [] },
]

const messageSeeds = [
  { tutorKey: 't1', sender: 'tutor' as const, text: 'Hi! Just confirming our session Monday at 4pm works for you.', timestamp: '2026-09-29T14:02:00' },
  { tutorKey: 't1', sender: 'student' as const, text: 'Yes that works, see you then!', timestamp: '2026-09-29T14:10:00' },
  { tutorKey: 't1', sender: 'tutor' as const, text: "Great - I'll send over a couple practice problems to look at beforehand.", timestamp: '2026-09-29T14:11:00' },
  { tutorKey: 't4', sender: 'student' as const, text: 'Hi James, could we move Thursday to 9am instead of 10am?', timestamp: '2026-09-27T09:00:00' },
  { tutorKey: 't4', sender: 'tutor' as const, text: '9am works on my end, updated the booking.', timestamp: '2026-09-27T09:20:00' },
]

async function main() {
  console.log('Clearing existing data...')
  await prisma.message.deleteMany()
  await prisma.conversation.deleteMany()
  await prisma.homeworkItem.deleteMany()
  await prisma.review.deleteMany()
  await prisma.session.deleteMany()
  await prisma.pricingTier.deleteMany()
  await prisma.timeOff.deleteMany()
  await prisma.availabilitySlot.deleteMany()
  await prisma.tutorProfile.deleteMany()
  await prisma.user.deleteMany()

  const passwordHash = await bcrypt.hash(DEMO_PASSWORD, 10)

  console.log('Creating tutors...')
  const tutorIdByKey: Record<string, string> = {}
  const tutorUserIdByKey: Record<string, string> = {}
  for (const t of tutorSeeds) {
    const user = await prisma.user.create({
      data: {
        email: t.email,
        passwordHash,
        name: t.name,
        role: 'TUTOR',
        tutorProfile: {
          create: {
            tagline: t.tagline,
            bio: t.bio,
            education: t.education,
            certifications: t.certifications,
            subjects: t.subjects,
            gradeLevels: t.gradeLevels.map((g) => gradeLevelFromApi[g]),
            hourlyRate: t.hourlyRate,
            format: formatFromApi[t.format],
            location: t.location,
            introVideoUrl: t.introVideoUrl,
            yearsExperience: t.yearsExperience,
            responseTime: t.responseTime,
            languages: t.languages,
            timezone: t.timezone,
            photo: `https://api.dicebear.com/9.x/avataaars/svg?seed=${encodeURIComponent(t.name)}`,
            availability: { create: t.availability.map((a) => ({ day: weekdayFromApi[a.day], start: a.start, end: a.end })) },
            timeOff: { create: t.timeOff },
            pricingTiers: { create: t.pricingTiers },
          },
        },
      },
      include: { tutorProfile: true },
    })
    tutorIdByKey[t.key] = user.tutorProfile!.id
    tutorUserIdByKey[t.key] = user.id

    for (const r of t.reviews) {
      const reviewerEmail = `${r.studentName.toLowerCase().replace(/[^a-z]+/g, '.')}${user.tutorProfile!.id.slice(-4)}@reviewers.brainbooked.dev`
      const reviewer = await prisma.user.create({
        data: { email: reviewerEmail, passwordHash, name: r.studentName, role: 'STUDENT' },
      })
      await prisma.review.create({
        data: {
          tutorId: user.tutorProfile!.id,
          studentId: reviewer.id,
          rating: r.rating,
          comment: r.comment,
          date: new Date(r.date),
        },
      })
    }
  }

  console.log('Creating demo student...')
  const student = await prisma.user.create({
    data: { email: 'student@brainbooked.dev', passwordHash, name: 'Jamie Student', role: 'STUDENT' },
  })

  console.log('Creating sessions...')
  const sessionIdByKey: Record<string, string> = {}
  for (const s of sessionSeeds) {
    const created = await prisma.session.create({
      data: {
        tutorId: tutorIdByKey[s.tutorKey],
        studentId: student.id,
        subject: s.subject,
        date: s.date,
        time: s.time,
        durationMins: s.durationMins,
        status: statusFromApi[s.status],
        format: sessionFormatFromApi[s.format],
        notes: 'notes' in s ? s.notes : undefined,
        homework: {
          create: s.homework.map((h) => ({
            fileName: h.fileName,
            filePath: `seed/${h.fileName}`,
            mimeType: 'application/pdf',
            sizeBytes: 0,
            uploadedAt: new Date(h.uploadedAt),
            feedback: 'feedback' in h ? h.feedback : undefined,
          })),
        },
      },
    })
    sessionIdByKey[s.key] = created.id
  }

  console.log('Creating conversations and messages...')
  const conversationIdByTutorKey: Record<string, string> = {}
  for (const tutorKey of ['t1', 't4']) {
    const conversation = await prisma.conversation.create({
      data: { studentId: student.id, tutorId: tutorIdByKey[tutorKey] },
    })
    conversationIdByTutorKey[tutorKey] = conversation.id
  }
  for (const m of messageSeeds) {
    await prisma.message.create({
      data: {
        conversationId: conversationIdByTutorKey[m.tutorKey],
        senderId: m.sender === 'student' ? student.id : tutorUserIdByKey[m.tutorKey],
        senderRole: m.sender === 'student' ? 'STUDENT' : 'TUTOR',
        text: m.text,
        timestamp: new Date(m.timestamp),
      },
    })
  }

  console.log('Seed complete.')
  console.log(`Demo student login: student@brainbooked.dev / ${DEMO_PASSWORD}`)
  console.log(`Demo tutor login:   maria.chen@brainbooked.dev / ${DEMO_PASSWORD}`)
}

main()
  .catch((e) => {
    console.error(e)
    process.exit(1)
  })
  .finally(() => prisma.$disconnect())
