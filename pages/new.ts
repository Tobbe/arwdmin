import fs from 'fs'
import path from 'path'

import { ejsRender } from '../ejs'

import { getModelNameVariants, ModelNameVariants } from '../schema'

export function createNewPage(pagesPath: string, modelName: string, appName: string) {
  const modelNameVariants = getModelNameVariants(modelName, appName)

  const newPage = generateNewModelPage(modelNameVariants)
  const newComponent = generateNewModelComponent(modelNameVariants)

  const newPagePath = createNewPageDir(
    pagesPath,
    modelNameVariants.pascalCaseModelName
  )
  writeNewPage(newPage, newPagePath, modelNameVariants.pascalCaseModelName)
  writeNewComponent(
    newComponent,
    newPagePath,
    modelNameVariants.pascalCaseModelName
  )
}

function generateNewModelPage({ pascalCaseModelName }: ModelNameVariants) {
  const model = {
    pascalName: pascalCaseModelName,
  }

  const template = fs.readFileSync('./templates/newModelPage.ejs', 'utf-8')

  return ejsRender(template, { model })
}

function generateNewModelComponent({
  pascalCaseModelName,
  camelCaseModelName,
  camelCasePluralModelName,
  capitalModelName,
}: ModelNameVariants) {
  const model = {
    pascalName: pascalCaseModelName,
    camelName: camelCaseModelName,
    camelPluralName: camelCasePluralModelName,
    capitalName: capitalModelName,
  }

  const template = fs.readFileSync('./templates/newModelComponent.ejs', 'utf-8')

  return ejsRender(template, { model })
}

function createNewPageDir(pagesPath: string, pascalName: string) {
  const newPagePath = path.join(
    pagesPath,
    pascalName,
    'New' + pascalName + 'Page'
  )

  fs.mkdirSync(newPagePath, { recursive: true })

  return newPagePath
}

function writeNewPage(
  newPage: string,
  newPagePath: string,
  pascalName: string
) {
  fs.writeFileSync(
    path.join(newPagePath, 'New' + pascalName + 'Page.tsx'),
    newPage
  )
}

function writeNewComponent(
  newComponent: string,
  newPagesPath: string,
  pascalName: string
) {
  fs.writeFileSync(
    path.join(newPagesPath, 'New' + pascalName + '.tsx'),
    newComponent
  )
}
