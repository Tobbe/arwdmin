import fs from 'fs'
import path from 'path'

export function generateAppName(rwRoot: string) {
  const appName = rwRoot.split(path.sep).at(-1)

  if (!appName) {
    console.error('Could not generate an app name')
    process.exit(1)
  }

  return appName
}

export function copyDatabaseUrl(baseProjectRoot: string, rwRoot: string) {
  const baseDotEnv = fs.readFileSync(path.join(baseProjectRoot, '.env'), 'utf-8')
  const databaseUrl = baseDotEnv.split('\n').find((row) => /^DATABASE_URL=/.test(row))

  if (!databaseUrl) {
    console.error('Could not find a DATABASE_URL')
    process.exit(1)
  }

  const dotEnv = fs.readFileSync(path.join(rwRoot, '.env'), 'utf-8')
  if (!dotEnv.split('\n').find((row) => /^DATABASE_URL=/.test(row))) {
    fs.writeFileSync(path.join(rwRoot, '.env'), dotEnv + '\n' + databaseUrl + '\n')
  }
}

export function cssOnly() {
  return (process.argv.includes('--css'))
}

export function getRwRoot() {
  // This is what we could be working with
  // argv [
  //   '/usr/local/bin/node',
  //   '/Users/tobbe/dev/redwood/radmin/redwood-admin.ts',
  //   '/Users/tobbe/dev/redwood/acm-admin',
  //   '--css'
  // ]
  // or
  // argv [
  //   '/usr/local/bin/node',
  //   '/Users/tobbe/dev/redwood/radmin/redwood-admin',
  //   '../acm-admin'
  // ]
  //
  // So, if the third item in argv is --css, then the forth is rwPath,
  // otherwise the third argument is rwRoot

  let rwRoot = process.argv[2]

  if (process.argv[2] === '--css') {
    rwRoot = process.argv[3]
  }

  if (!rwRoot) {
    console.error('You need to specify where you want to generate the admin panel')
    process.exit(1)
  }

  return rwRoot
}