import fs from 'fs'
import path from 'path'

import { ejsRender } from '../ejs'

import type { DMMF } from '@prisma/generator-helper'
import { getModelNameVariants, ModelNameVariants } from '../schema'

export function createEditPage(
  pagesPath: string,
  modelName: string,
  modelFields: DMMF.Field[],
  appName: string
) {
  const modelNameVariants = getModelNameVariants(modelName, appName)

  const editPage = generateEditModelPage(modelNameVariants)
  const editCell = generateEditModelCell(modelNameVariants, modelFields)

  const editPagePath = createEditPageDir(
    pagesPath,
    modelNameVariants.pascalCaseModelName
  )
  writeEditPage(editPage, editPagePath, modelNameVariants.pascalCaseModelName)
  writeEditCell(editCell, editPagePath, modelNameVariants.pascalCaseModelName)
}

function generateEditModelPage({ pascalCaseModelName }: ModelNameVariants) {
  const model = {
    pascalName: pascalCaseModelName,
  }

  const template = fs.readFileSync('./templates/editModelPage.ejs', 'utf-8')

  return ejsRender(template, { model })
}

function generateEditModelCell(
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

  const template = fs.readFileSync('./templates/editModelCell.ejs', 'utf-8')

  // Skip all relation fields (but we still keep relation ids)
  // So if the model has `authorId: Int` and `author: Author` we'll only
  // include `authorId`
  function isRelation(field: DMMF.Field) {
    return field.kind === 'object'
  }

  const fields = modelFields.filter((field) => !isRelation(field))

  const idField = modelFields.find((field) => field.isId)
  const idFieldType = idField?.type || "String"

  return ejsRender(template, { model, modelFields: fields, idFieldType })
}

function createEditPageDir(pagesPath: string, pascalName: string) {
  const editPagePath = path.join(
    pagesPath,
    pascalName,
    'Edit' + pascalName + 'Page'
  )

  fs.mkdirSync(editPagePath, { recursive: true })

  return editPagePath
}

function writeEditPage(
  editPage: string,
  editPagePath: string,
  pascalName: string
) {
  fs.writeFileSync(
    path.join(editPagePath, 'Edit' + pascalName + 'Page.tsx'),
    editPage
  )
}

function writeEditCell(
  editCell: string,
  editPagePath: string,
  pascalName: string
) {
  fs.writeFileSync(
    path.join(editPagePath, 'Edit' + pascalName + 'Cell.tsx'),
    editCell
  )
}
