import fs from 'fs'
import path from 'path'

import type { DMMF } from '@prisma/generator-helper'

import { ejsRender } from '../ejs'
import {
  getEnums,
  getModelFields,
  getModelNameVariants,
  ModelNameVariants,
} from '../schema'
import { createEditPage } from './edit'
import { createNewPage } from './new'
import { getRenderDataFunction } from './schemaRender'

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

// I was struggling with "path" vs "dir". Ultimately I decided that "dir" is
// the actual directory or folder. "path" is the path to the dir. "path" is
// always a string
export function createComponentsDir(rwRoot: string) {
  const componentsPath = path.join(
    rwRoot,
    'web',
    'src',
    'components',
    'arwdmin'
  )

  fs.rmSync(componentsPath, { recursive: true, force: true })
  fs.mkdirSync(componentsPath)

  return componentsPath
}

// TODO: Skip (and warn) models that don't have an id column
// TODO: Test with pokemon.
//       Test with DVD (all-caps model).
//       Test with QRCode (partly all-caps).
//       Test with single-character model names, both upper- and lowercase
export async function createModelPages(
  rwRoot: string,
  pagesPath: string,
  componentsPath: string,
  modelNames: string[]
) {
  const paginatorPath = path.join(componentsPath, 'Paginator', 'Paginator.tsx')
  const paginatorComponent = generatePaginatorComponent()

  fs.mkdirSync(path.join(componentsPath, 'Paginator'), { recursive: true })
  fs.writeFileSync(paginatorPath, paginatorComponent)
  fs.copyFileSync(
    './templates/css/Paginator.css',
    path.join(componentsPath, 'Paginator', 'Paginator.css')
  )

  for (const modelName of modelNames) {
    console.log('Creating pages for', modelName)
    const modelFields = await getModelFields(rwRoot, modelName)
    const enums = await getEnums(rwRoot)
    const renderDataFunction = getRenderDataFunction(modelFields, enums)

    const modelNameVariants = getModelNameVariants(modelName)

    const modelListPage = generateModelListPage({
      pascalCasePluralName: modelNameVariants.pascalCasePluralModelName,
    })
    const modelListCell = generateModelListCell(modelNameVariants, modelFields)
    const modelListComponent = generateModelListComponent(
      modelNameVariants,
      modelFields,
      renderDataFunction
    )
    const modelPage = generateModelPage(modelNameVariants)
    const modelCell = generateModelCell(modelNameVariants, modelFields)
    const modelComponent = generateModelComponent(
      modelNameVariants,
      modelFields,
      renderDataFunction
    )

    const modelForm = generateModelForm(
      modelNameVariants,
      modelFields,
      renderDataFunction
    )

    // TODO: Extract createListPage and createDetailsPage (or createSinglePage)
    // similar to crateNewPage and createEditPage below
    createNewPage(pagesPath, modelName)
    createEditPage(pagesPath, modelName, modelFields)

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

    // ModelForm
    fs.mkdirSync(
      path.join(componentsPath, modelNameVariants.pascalCaseModelName),
      { recursive: true }
    )

    fs.writeFileSync(
      path.join(
        componentsPath,
        modelNameVariants.pascalCaseModelName,
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

  // Skip all relation fields (but we still keep relation ids)
  // So if the model has `authorId: Int` and `author: Author` we'll only
  // include `authorId`
  function isRelation(field: DMMF.Field) {
    return field.kind === 'object'
  }

  const fields = modelFields.filter((field) => !isRelation(field))

  return ejsRender(template, { model, modelFields: fields })
}

function generateModelListComponent(
  {
    modelName,
    pascalCasePluralModelName,
    pascalCaseModelName,
    camelCaseModelName,
    camelCasePluralModelName,
    humanizedPlural,
    humanizedName,
  }: ModelNameVariants,
  modelFields: DMMF.Field[],
  getRenderData: (fieldName: string) => any
) {
  const model = {
    name: modelName,
    pluralName: pascalCasePluralModelName,
    pascalName: pascalCaseModelName,
    camelName: camelCaseModelName,
    camelPluralName: camelCasePluralModelName,
    humanizedPluralName: humanizedPlural,
    humanizedName: humanizedName,
  }

  // TODO: Make sure the sr-only css class exists
  const template = fs.readFileSync(
    './templates/modelListComponent.ejs',
    'utf-8'
  )

  return ejsRender(template, { model, modelFields, getRenderData })
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

  // Skip all relation fields (but we still keep relation ids)
  // So if the model has `authorId: Int` and `author: Author` we'll only
  // include `authorId`
  function isRelation(field: DMMF.Field) {
    return field.kind === 'object'
  }

  const fields = modelFields.filter((field) => !isRelation(field))

  return ejsRender(template, { model, modelFields: fields })
}

function generateModelComponent(
  {
    pascalCaseModelName,
    pascalCasePluralModelName,
    camelCaseModelName,
    capitalModelName,
  }: ModelNameVariants,
  modelFields: DMMF.Field[],
  // TODO: Fix return type
  getRenderData: (fieldName: string) => any
) {
  const model = {
    pascalName: pascalCaseModelName,
    pascalPluralName: pascalCasePluralModelName,
    camelName: camelCaseModelName,
    capitalName: capitalModelName,
  }

  const template = fs.readFileSync('./templates/modelComponent.ejs', 'utf-8')

  return ejsRender(template, { model, modelFields, getRenderData })
}

function generatePaginatorComponent() {
  const template = fs.readFileSync(
    './templates/paginatorComponent.ejs',
    'utf-8'
  )

  return ejsRender(template, {})
}

function generateModelForm(
  {
    pascalCaseModelName,
    camelCaseModelName,
    camelCasePluralModelName,
    capitalModelName,
    kebabModelName,
  }: ModelNameVariants,
  modelFields: DMMF.Field[],
  // TODO: Fix return type
  getRenderData: (fieldName: string) => any
) {
  const model = {
    pascalName: pascalCaseModelName,
    camelName: camelCaseModelName,
    camelPluralName: camelCasePluralModelName,
    capitalName: capitalModelName,
    kebabName: kebabModelName,
  }

  const template = fs.readFileSync('./templates/modelForm.ejs', 'utf-8')

  // Skip all relation fields (but we still keep relation ids)
  // So if the model has `authorId: Int` and `author: Author` we'll only
  // include `authorId`
  function isRelation(field: DMMF.Field) {
    return field.kind === 'object'
  }

  // Don't include id fields with default values, or `updatedAt` fields, or
  // fields with default `now()` or `autoincrement()` functions
  function isAutoGenerated(field: DMMF.Field) {
    return (
      (field.isId && field.hasDefaultValue) ||
      field.isUpdatedAt ||
      (field.default as DMMF.FieldDefault | undefined)?.name === 'now' ||
      (field.default as DMMF.FieldDefault | undefined)?.name === 'autoincrement'
    )
  }

  const fields = modelFields.filter(
    (field) => !isRelation(field) && !isAutoGenerated(field)
  )

  return ejsRender(template, { model, modelFields: fields, getRenderData })
}
