import fs from 'fs'
import path from 'path'
import { ejsRender } from './ejs'
import { getModelNameVariants } from './schema'

function generateLayout(modelNames: string[], appName: string) {
  const models = modelNames.map((modelName) => {
    const modelNameVariants = getModelNameVariants(modelName, appName)

    return {
      pascalPluralName: modelNameVariants.pascalCasePluralModelName,
      humanizedPlural: modelNameVariants.humanizedPlural,
    }
  })

  const template: string = fs.readFileSync('./templates/layout.ejs', 'utf-8')

  return ejsRender(template, { models })
}

export function createArwdminLayoutDir(rwRoot: string) {
  // TODO: read 'web' name from redwood.toml
  const layoutPath = path.join(rwRoot, 'web', 'src', 'layouts', 'ArwdminLayout')

  // TODO: Prompt if this dir already exists if this is the first time running
  // aRWdmin
  if (!fs.existsSync(layoutPath)) {
    fs.mkdirSync(layoutPath, { recursive: true })
  }

  return layoutPath
}

export function createLayout(layoutPath: string, modelNames: string[], appName: string) {
  const layout = generateLayout(modelNames, appName)

  fs.writeFileSync(path.join(layoutPath, 'ArwdminLayout.tsx'), layout)
  fs.copyFileSync(
    './templates/css/ArwdminLayout.css',
    path.join(layoutPath, 'ArwdminLayout.css')
  )
}
