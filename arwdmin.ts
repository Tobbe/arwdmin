// Run me with
// npx @digitak/esrun arwdmin.ts

import fs from 'fs'
import path from 'path'
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

console.log('aRWdmin v0.1.0')
console.log()

function findRwRoot(dir = process.cwd()): string {
  if (fs.existsSync(path.join(dir, 'redwood.toml'))) {
    return dir
  }

  return findRwRoot(dir.split(path.sep).slice(0, -1).join(path.sep))
}

const rwRoot = findRwRoot(path.join(process.cwd(), '..', 'acm-admin'))
const modelNames = await getModelNames(rwRoot)

const pagesPath = createArwdminPagesDir(rwRoot)
const componentsPath = createComponentsDir(rwRoot)
await createModelPages(rwRoot, pagesPath, componentsPath, modelNames)

const layoutPath = createArwdminLayoutDir(rwRoot)
createLayout(layoutPath, modelNames)

updateRoutes(rwRoot, modelNames)

const tmpServicesName = prepareGeneratorDir(rwRoot, 'services')
const tmpGraphqlName = prepareGeneratorDir(rwRoot, 'graphql')

// The sdl generator also generates services
await generateSdls(rwRoot, modelNames)

moveArwdminServices(rwRoot, tmpServicesName)
moveArwdminSdls(rwRoot, tmpGraphqlName)
