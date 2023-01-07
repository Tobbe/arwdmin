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
    fs.writeFileSync(path.join(rwRoot, '.env'), dotEnv + '\n\n' + databaseUrl)
  }
}