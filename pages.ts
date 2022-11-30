import fs from 'fs'
import path from 'path'

import type { DMMF } from '@prisma/generator-helper'

import { ejsRender } from './ejs'
import {
  getModelFields,
  getModelNameVariants,
  ModelNameVariants,
} from './schema'

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

export function getComponentsDir(rwRoot: string) {
  const componentsDir = path.join(rwRoot, 'web', 'src', 'components', 'arwdmin')

  fs.rmSync(componentsDir, { recursive: true, force: true })
  fs.mkdirSync(componentsDir)

  return componentsDir
}

// TODO: Skip (and warn) models that don't have an id column
// TODO: Test with pokemon.
//       Test with DVD (all-caps model).
//       Test with QRCode (partly all-caps).
//       Test with single-character model names, both upper- and lowercase
export async function createModelPages(
  rwRoot: string,
  pagesPath: string,
  componentsDir: string,
  modelNames: string[]
) {
  const paginatorPath = path.join(componentsDir, 'Paginator', 'Paginator.tsx')
  const paginatorComponent = generatePaginatorComponent()

  fs.mkdirSync(
    path.join(
      componentsDir,
      'Paginator'
    ),
    { recursive: true }
  )
  fs.writeFileSync(paginatorPath, paginatorComponent)

  for (const modelName of modelNames) {
    console.log('Creating pages for', modelName)
    const fields = await getModelFields(rwRoot, modelName)

    const modelNameVariants = getModelNameVariants(modelName)

    const modelListPage = generateModelListPage({
      pascalCasePluralName: modelNameVariants.pascalCasePluralModelName,
    })
    const modelListCell = generateModelListCell(modelNameVariants, fields)
    const modelListComponent = generateModelListComponent(
      modelNameVariants,
      fields
    )
    const modelPage = generateModelPage(modelNameVariants)
    const modelCell = generateModelCell(modelNameVariants, fields)
    const modelComponent = generateModelComponent(modelNameVariants, fields)

    const newModelPage = generateNewModelPage(modelNameVariants)
    const newModelComponent = generateNewModelComponent(modelNameVariants)
    const modelForm = generateModelForm(modelNameVariants, fields)

    // List page + components
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

    // Single page + components
    fs.mkdirSync(
      path.join(
        pagesPath,
        modelNameVariants.pascalCaseModelName,
        modelNameVariants.pascalCaseModelName + 'Page'
      ),
      { recursive: true }
    )

    fs.writeFileSync(
      path.join(
        pagesPath,
        modelNameVariants.pascalCaseModelName,
        modelNameVariants.pascalCaseModelName + 'Page',
        modelNameVariants.pascalCaseModelName + 'Page.tsx'
      ),
      modelPage
    )

    fs.writeFileSync(
      path.join(
        pagesPath,
        modelNameVariants.pascalCaseModelName,
        modelNameVariants.pascalCaseModelName + 'Page',
        modelNameVariants.pascalCaseModelName + '.tsx'
      ),
      modelComponent
    )

    fs.writeFileSync(
      path.join(
        pagesPath,
        modelNameVariants.pascalCaseModelName,
        modelNameVariants.pascalCaseModelName + 'Page',
        modelNameVariants.pascalCaseModelName + 'Cell.tsx'
      ),
      modelCell
    )

    // New Model page + components
    fs.mkdirSync(
      path.join(pagesPath,
        modelNameVariants.pascalCaseModelName,
        'New' + modelNameVariants.pascalCaseModelName + 'Page'
      ),
      { recursive: true }
    )

    fs.writeFileSync(
      path.join(
        pagesPath,
        modelNameVariants.pascalCaseModelName,
        'New' + modelNameVariants.pascalCaseModelName + 'Page',
        'New' + modelNameVariants.pascalCaseModelName + 'Page.tsx'
      ),
      newModelPage
    )

    fs.writeFileSync(
      path.join(
        pagesPath,
        modelNameVariants.pascalCaseModelName,
        'New' + modelNameVariants.pascalCaseModelName + 'Page',
        'New' + modelNameVariants.pascalCaseModelName + '.tsx'
      ),
      newModelComponent
    )

    fs.writeFileSync(
      path.join(
        pagesPath,
        modelNameVariants.pascalCaseModelName,
        'New' + modelNameVariants.pascalCaseModelName + 'Page',
        modelNameVariants.pascalCaseModelName + 'Form.tsx'
      ),
      modelForm
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
  {
    modelName,
    pascalCasePluralModelName,
    camelCaseModelName,
    camelCasePluralModelName,
  }: ModelNameVariants,
  modelFields: DMMF.Field[]
) {
  const model = {
    name: modelName,
    pascalPluralName: pascalCasePluralModelName,
    camelName: camelCaseModelName,
    camelPluralName: camelCasePluralModelName,
  }

  const template = fs.readFileSync('./templates/modelListCell.ejs', 'utf-8')

  return ejsRender(template, { model, modelFields })
}

function generateModelListComponent(
  {
    modelName,
    pascalCasePluralModelName,
    pascalCaseModelName,
    camelCaseModelName,
    camelCasePluralModelName,
  }: ModelNameVariants,
  modelFields: DMMF.Field[]
) {
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

  return ejsRender(template, { model, modelFields })
}

function generateModelPage({ pascalCaseModelName }: ModelNameVariants) {
  const model = {
    pascalName: pascalCaseModelName,
  }

  const template = fs.readFileSync('./templates/modelPage.ejs', 'utf-8')

  return ejsRender(template, { model })
}

function generateModelCell(
  { pascalCaseModelName, camelCaseModelName }: ModelNameVariants,
  modelFields: DMMF.Field[]
) {
  const model = {
    pascalName: pascalCaseModelName,
    camelName: camelCaseModelName,
  }

  const template = fs.readFileSync('./templates/modelCell.ejs', 'utf-8')

  return ejsRender(template, { model, modelFields })
}

function generateModelComponent(
  {
    pascalCaseModelName,
    pascalCasePluralModelName,
    camelCaseModelName,
    capitalModelName,
  }: ModelNameVariants,
  modelFields: DMMF.Field[]
) {
  const model = {
    pascalName: pascalCaseModelName,
    pascalPluralName: pascalCasePluralModelName,
    camelName: camelCaseModelName,
    capitalName: capitalModelName,
  }

  const template = fs.readFileSync('./templates/modelComponent.ejs', 'utf-8')

  return ejsRender(template, { model, modelFields })
}

function generatePaginatorComponent() {
  const template = fs.readFileSync(
    './templates/paginatorComponent.ejs',
    'utf-8'
  )

  return ejsRender(template, {})
}

function generateNewModelPage({ pascalCaseModelName }: ModelNameVariants) {
  const model = {
    pascalName: pascalCaseModelName,
  }

  const template = fs.readFileSync('./templates/newModelPage.ejs', 'utf-8')

  return ejsRender(template, { model })
}

function generateNewModelComponent(
  {
    pascalCaseModelName,
    camelCaseModelName,
    camelCasePluralModelName,
    capitalModelName,
  }: ModelNameVariants,
) {
  const model = {
    pascalName: pascalCaseModelName,
    camelName: camelCaseModelName,
    camelPluralName: camelCasePluralModelName,
    capitalName: capitalModelName,
  }

  const template = fs.readFileSync('./templates/newModelComponent.ejs', 'utf-8')

  return ejsRender(template, { model })
}

function generateModelForm(
  {
    pascalCaseModelName,
    camelCaseModelName,
    camelCasePluralModelName,
    capitalModelName,
  }: ModelNameVariants,
  modelFields: DMMF.Field[]
) {
  const model = {
    pascalName: pascalCaseModelName,
    camelName: camelCaseModelName,
    camelPluralName: camelCasePluralModelName,
    capitalName: capitalModelName,
  }

  const template = fs.readFileSync('./templates/modelForm.ejs', 'utf-8')

  return ejsRender(template, { model, modelFields })
}
