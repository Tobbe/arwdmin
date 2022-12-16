// Run me with
// npx @digitak/esrun arwdmin.ts
// npx tsx arwdmin

import fs from 'fs'
import path from 'path'
import { addAuthModel, createAuthPages, setupAuth } from './auth'
import { copyPrismaSchema } from './schema'
import { addArwdminFormatters } from './formatters'
import { createArwdminLayoutDir, createLayout } from './layout'
import { createArwdminPagesDir, createModelPages, createComponentsDir, createArwdminPage } from './pages/pages'

import { updateRoutes } from './routes'
import { getModelNames } from './schema'
import {
  generateSdls,
  moveArwdminSdls,
  prepareGeneratorDir,
} from './sdl'
import { moveArwdminServices } from './services'
import { addMainStyles } from './styling'

console.log('aRWdmin v0.1.0')
console.log()

// TODO: This should just be findRwRoot() when this is an npx command you run
// inside your project
const baseProjectRoot = findRwRoot(path.join(process.cwd(), '..', 'acm-store-rw'))
const rwRoot = path.join(baseProjectRoot, '..', 'acm-admin')

if (process.argv.includes('--css')) {
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

const pagesPath = createArwdminPagesDir(rwRoot)

addAuthModel(baseProjectRoot)
copyPrismaSchema(baseProjectRoot, rwRoot)
setupAuth(rwRoot)
createAuthPages(pagesPath)

const modelNames = await getModelNames(rwRoot)

const componentsPath = createComponentsDir(rwRoot)
await createModelPages(rwRoot, pagesPath, componentsPath, modelNames)
createArwdminPage(pagesPath)

const layoutPath = createArwdminLayoutDir(rwRoot)
createLayout(layoutPath, modelNames)

addMainStyles(rwRoot)

addArwdminFormatters(rwRoot)

await updateRoutes(rwRoot, modelNames)

const tmpServicesName = prepareGeneratorDir(rwRoot, 'services')
const tmpGraphqlName = prepareGeneratorDir(rwRoot, 'graphql')

// The sdl generator also generates services
await generateSdls(rwRoot, modelNames)

moveArwdminServices(rwRoot, tmpServicesName)
moveArwdminSdls(rwRoot, tmpGraphqlName)