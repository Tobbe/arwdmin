// Run me with
// npx @digitak/esrun arwdmin.ts

import fs from 'fs'
import path from 'path'
import { createArwdminLayoutDir, createLayout } from './layout'
import { createArwdminPagesDir, createModelPages } from './pages'

import { updateRoutes } from './routes'
import { getModelNames } from './schema'

console.log('aRWdmin v0.1.0')

function findRwRoot(dir = process.cwd()): string {
  if (fs.existsSync(path.join(dir, 'redwood.toml'))) {
    return dir
  }

  return findRwRoot(dir.split(path.sep).slice(0, -1).join(path.sep))
}

const rwRoot = findRwRoot(path.join(process.cwd(), '..', 'acm-admin'))
const modelNames = await getModelNames(rwRoot)

const pagesPath = createArwdminPagesDir(rwRoot)
await createModelPages(rwRoot, pagesPath, modelNames)

const layoutPath = createArwdminLayoutDir(rwRoot)
createLayout(layoutPath, modelNames)

updateRoutes(rwRoot, modelNames)
