// Run me with
// npx @digitak/esrun arwdmin.ts

import fs from 'fs'
import path from 'path'
import { addArwdminFormatters } from './formatters'
import { createArwdminLayoutDir, createLayout } from './layout'
import { createArwdminPagesDir, createModelPages, createComponentsDir } from './pages/pages'

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

if (process.argv.includes('--css')) {
  const rwRoot = findRwRoot(path.join(process.cwd(), '..', 'acm-admin'))
  addMainStyles(rwRoot)

  process.exit(0)
}

function findRwRoot(dir = process.cwd()): string {
  if (fs.existsSync(path.join(dir, 'redwood.toml'))) {
    return dir
  }

  return findRwRoot(dir.split(path.sep).slice(0, -1).join(path.sep))
}

const rwRoot = findRwRoot(path.join(process.cwd(), '..', 'acm-admin'))

// TODO: Copy over schema.prisma from base RW project

const modelNames = await getModelNames(rwRoot)

const pagesPath = createArwdminPagesDir(rwRoot)
const componentsPath = createComponentsDir(rwRoot)
await createModelPages(rwRoot, pagesPath, componentsPath, modelNames)

const layoutPath = createArwdminLayoutDir(rwRoot)
createLayout(layoutPath, modelNames)

addMainStyles(rwRoot)

addArwdminFormatters(rwRoot)

updateRoutes(rwRoot, modelNames)

const tmpServicesName = prepareGeneratorDir(rwRoot, 'services')
const tmpGraphqlName = prepareGeneratorDir(rwRoot, 'graphql')

// The sdl generator also generates services
await generateSdls(rwRoot, modelNames)

moveArwdminServices(rwRoot, tmpServicesName)
moveArwdminSdls(rwRoot, tmpGraphqlName)
