import fs from 'fs'
import path from 'path'

import type { DMMF } from '@prisma/generator-helper'

import { ejsRender } from './ejs'
import { getModelFields, getModelNameVariants, ModelNameVariants } from './schema'

export function createArwdminPagesDir(rwRoot: string) {
  // TODO: read 'web' name from redwood.toml
  const pagesPath = path.join(rwRoot, 'web', 'src', 'pages', 'Arwdmin')

  // TODO: Prompt if this dir already exists if this is the first time running
  // aRWdmin
  // Begin by deleting to make sure we're removing pages for models that the
  // user has removed
  fs.rmSync(pagesPath, { recursive: true, force: true })
  fs.mkdirSync(pagesPath)

  return pagesPath
}

// TODO: Skip (and warn) models that don't have an id column
// TODO: Test with pokemon.
//       Test with DVD (all-caps model).
//       Test with QRCode (partly all-caps).
//       Test with single-character model names, both upper- and lowercase
export async function createModelPages(
  rwRoot: string,
  pagesPath: string,
  modelNames: string[]
) {
  for (const modelName of modelNames) {
    console.log('Creating pages for', modelName)
    const fields = await getModelFields(rwRoot, modelName)

    const modelNameVariants = getModelNameVariants(modelName)

    const modelListPage = generateModelListPage({
      pascalCasePluralName: modelNameVariants.pascalCasePluralModelName,
    })
    const modelListCell = generateModelListCell(modelNameVariants, fields)
    const modelListComponent = generateModelListComponent(modelNameVariants)
    // const modelPage = generateModelComponent(modelNameVariants);
    // const modelCell = generateModelComponent(modelNameVariants);
    // const modelComponent = generateModelComponent(modelNameVariants);

    fs.mkdirSync(
      path.join(
        pagesPath,
        modelNameVariants.pascalCaseModelName,
        modelNameVariants.pascalCasePluralModelName + 'Page'
      ),
      { recursive: true }
    )

    fs.writeFileSync(
      path.join(
        pagesPath,
        modelNameVariants.pascalCaseModelName,
        modelNameVariants.pascalCasePluralModelName + 'Page',
        modelNameVariants.pascalCasePluralModelName + 'Page.tsx'
      ),
      modelListPage
    )

    fs.writeFileSync(
      path.join(
        pagesPath,
        modelNameVariants.pascalCaseModelName,
        modelNameVariants.pascalCasePluralModelName + 'Page',
        modelNameVariants.pascalCasePluralModelName + '.tsx'
      ),
      modelListComponent
    )

    fs.writeFileSync(
      path.join(
        pagesPath,
        modelNameVariants.pascalCaseModelName,
        modelNameVariants.pascalCasePluralModelName + 'Page',
        modelNameVariants.pascalCasePluralModelName + 'Cell.tsx'
      ),
      modelListCell
    )
  }
}

function generateModelListPage({
  pascalCasePluralName,
}: {
  pascalCasePluralName: string
}): string {
  const template: string = fs.readFileSync(
    './templates/modelListPage.ejs',
    'utf-8'
  )

  return ejsRender(template, { model: { pascalCasePluralName } })
}

function generateModelListCell(
  { modelName, pluralModelName, camelCasePluralModelName }: ModelNameVariants,
  modelFields: DMMF.Field[]
) {
  const model = {
    name: modelName,
    pluralName: pluralModelName,
    camelPluralName: camelCasePluralModelName,
  }

  const template = fs.readFileSync('./templates/modelListCell.ejs', 'utf-8')

  return ejsRender(template, { model, modelFields })
}

function generateModelListComponent({
  modelName,
  pascalCasePluralModelName,
  pascalCaseModelName,
  camelCaseModelName,
  camelCasePluralModelName,
}: ModelNameVariants) {
  const model = {
    name: modelName,
    pluralName: pascalCasePluralModelName,
    pascalName: pascalCaseModelName,
    camelName: camelCaseModelName,
    camelPluralName: camelCasePluralModelName,
  }

  // TODO: Make sure the sr-only css class exists
  const template = fs.readFileSync(
    './templates/modelListComponent.ejs',
    'utf-8'
  )

  return ejsRender(template, { model })
}