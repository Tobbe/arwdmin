import fs from 'fs'
import path from 'path'

import { execaSync } from 'execa'

export async function addAuthModel(baseProjectRoot: string) {
  // Add dbAuth model
  const schemaPath = path.join(baseProjectRoot, 'api', 'db', 'schema.prisma')
  console.log('Adding dbAuth model to', schemaPath)
  let schema = fs.readFileSync(schemaPath, 'utf-8')

  // TODO: Remove existing ArwdminUser model
  //       Figure out how to handle prisma migrations if/when we do

  if (!schema.includes('ArwdminUser')) {
    schema += `
model ArwdminUser {
  id                  Int       @id @default(autoincrement())
  email               String    @unique
  hashedPassword      String
  salt                String
  resetToken          String?
  resetTokenExpiresAt DateTime?
  approved            Boolean   @default(false)
}
`

    fs.writeFileSync(schemaPath, schema)

    // Should we run a migrate diff before this, to make sure we're not
    // migrating anything the user isn't prepared for
    // Warn and exit
    // yarn rw prisma migrate diff --from-schema-datamodel api/db/schema.prisma --to-schema-datasource api/db/schema.prisma
    // TODO: Add confirmation if DATABASE_URL isn't localhost. Mask password
    // when asking for confirmation
    execaSync('yarn', ['rw', 'prisma', 'migrate', 'dev', '-n', 'arwdminUser'], {
      cwd: baseProjectRoot,
    })
  }
}

export async function setupAuth(rwRoot: string) {
  console.log('running setup command for dbAuth')

  // TODO: Replace by manual setup to not interfere with existing auth
  // execaSync('yarn', ['add', '@redwoodjs/auth-dbauth-setup@canary'], {
  //   cwd: rwRoot,
  // })
  // execaSync(
  //   'yarn',
  //   ['rw', 'setup', 'auth', 'dbAuth', '--no-warn', '--no-webauthn', '-f'],
  //   {
  //     cwd: rwRoot,
  //   }
  // )

  // Update api/functions/auth.ts
  // TODO: Support auth.js
  const apiFunctionsAuthPath = path.join(
    rwRoot,
    'api',
    'src',
    'functions',
    'auth.ts'
  )
  const authLines = fs
    .readFileSync(apiFunctionsAuthPath, 'utf-8')
    .replace('salt, userAttributes', 'salt')
    .replace('db.user.create', 'db.arwdminUser.create')
    .replace("authModelAccessor: 'user',", "authModelAccessor: 'arwdminUser',")
    .replace(/\s*\/\/ name: userAttributes.name/, '')
    .split('\n')
  let loginHandlerReturnIndex = -1
  let loginHandlerStartIndex = -1
  let index = 0

  // The return part of the login function isn't unique. It looks exactly like
  // the one for forgotPassword. So we need to first find where the login
  // method starts. Then we can go look for the return statement
  while (loginHandlerReturnIndex === -1 && index < authLines.length) {
    const line = authLines[index] || ''

    if (/const loginOptions.*= {/.test(line)) {
      loginHandlerStartIndex = index
    }

    if (loginHandlerStartIndex >= 0 && /^\s*return user\s*$/.test(line)) {
      loginHandlerReturnIndex = index
    }

    index++
  }

  if (
    loginHandlerReturnIndex >= 0 &&
    !authLines.some((line) => line.includes('!user.approved'))
  ) {
    authLines.splice(
      loginHandlerReturnIndex,
      1,
      '      if (!user.approved) {',
      "        throw new Error('You are not approved yet')",
      '      }',
      '',
      '      return user'
    )
  }

  fs.writeFileSync(apiFunctionsAuthPath, authLines.join('\n'))

  // TODO: auth.js
  const apiLibAuthPath = path.join(rwRoot, 'api', 'src', 'lib', 'auth.ts')
  const libAuth = fs
    .readFileSync(apiLibAuthPath, 'utf-8')
    .replace('db.user.findUnique', 'db.arwdminUser.findUnique')
  fs.writeFileSync(apiLibAuthPath, libAuth)
}