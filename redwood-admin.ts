// Run me with
// npx tsx redwood-admin /path/to/admin

import fs from 'fs'
import path from 'path'
import { addAuthModel, createAuthPages, setupAuth } from './auth'
import { copyPrismaSchema } from './schema'
import { addRadminFormatters } from './formatters'
import { createRadminLayoutDir, createLayout } from './layout'
import { createRadminPagesDir, createModelPages, createComponentsDir, createRadminPage } from './pages/pages'

import { updateRoutes } from './routes'
import { getModelNames } from './schema'
import {
  generateSdls,
  moveRadminSdls,
  prepareGeneratorDir,
} from './sdl'
import { moveRadminServices } from './services'
import { addMainStyles } from './styling'
import { updateRedwoodToml } from './redwoodToml'
import { copyDatabaseUrl, cssOnly, generateAppName, getRwRoot } from './radminInit'

console.log('Radmin v0.1.0')
console.log()

// TODO: This should just be findRwRoot() when this is an npx command you run
// inside your project
const baseProjectRoot = findRwRoot(path.join(process.cwd(), '..', 'acm-store-rw'))

const rwRoot = getRwRoot()

if (cssOnly()) {
  addMainStyles(rwRoot)

  process.exit(0)
}

function findRwRoot(dir = process.cwd()): string {
  if (!dir) {
    console.error('Could not find Redwood root dir')
    process.exit(1)
  }

  if (fs.existsSync(path.join(dir, 'redwood.toml'))) {
    return dir
  }

  return findRwRoot(dir.split(path.sep).slice(0, -1).join(path.sep))
}

const appName = generateAppName(rwRoot)

updateRedwoodToml(rwRoot, appName)

const pagesPath = createRadminPagesDir(rwRoot)

addAuthModel(baseProjectRoot)
copyPrismaSchema(baseProjectRoot, rwRoot)
copyDatabaseUrl(baseProjectRoot, rwRoot)
setupAuth(rwRoot)
createAuthPages(pagesPath)

const modelNames = await getModelNames(rwRoot)

const componentsPath = createComponentsDir(rwRoot)
await createModelPages(rwRoot, pagesPath, componentsPath, modelNames, appName)
createRadminPage(appName, pagesPath)

const layoutPath = createRadminLayoutDir(rwRoot)
createLayout(layoutPath, modelNames, appName)

addMainStyles(rwRoot)

addRadminFormatters(rwRoot)

await updateRoutes(rwRoot, modelNames, appName)

const tmpServicesName = prepareGeneratorDir(rwRoot, 'services')
const tmpGraphqlName = prepareGeneratorDir(rwRoot, 'graphql')

// The sdl generator also generates services
await generateSdls(rwRoot, modelNames, appName)

moveRadminServices(rwRoot, tmpServicesName)
moveRadminSdls(rwRoot, tmpGraphqlName)