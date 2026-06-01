import { PrismaClient } from '@prisma/client'
import { createHash } from 'crypto'

const prisma = new PrismaClient()

function hashPassword(password: string) {
  return createHash('sha256').update(password + process.env.AUTH_SECRET).digest('hex')
}

async function main() {
  const email = process.env.ADMIN_EMAIL || 'ika.trefon@gmail.com'
  const password = process.env.ADMIN_PASSWORD || 'changeme'

  const existing = await prisma.user.findUnique({ where: { email } })
  if (existing) {
    console.log(`User ${email} already exists`)
    return
  }

  await prisma.user.create({
    data: {
      email,
      password: hashPassword(password),
      name: 'Michał',
      isAdmin: true,
    },
  })
  console.log(`Created admin user: ${email}`)
}

main().catch(console.error).finally(() => prisma.$disconnect())
