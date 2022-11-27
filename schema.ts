import path from 'path'

import prismaSdk from '@prisma/sdk'
import camelcase from 'camelcase'
import pascalcase from 'pascalcase'

import { pluralize } from './lib/rwPluralize'

const { getDMMF } = prismaSdk

/*
 * Returns the DMMF defined by `prisma` resolving the relevant `schema.prisma` path.
 */
function getSchemaDefinitions(rwRoot: string) {
  // TODO: read 'api' name from redwood.toml
  const schemaPath = path.join(rwRoot, 'api', 'db', 'schema.prisma')

  return getDMMF({ datamodelPath: schemaPath })
}

export async function getModelNames(rwRoot: string) {
  const schema = await getSchemaDefinitions(rwRoot)
  const modelNames: string[] = []

  for (const model of schema.datamodel.models) {
    if (model.documentation === '@arwdmin skip') {
      console.log("Skipping", model.name)
    } else {
      modelNames.push(model.name)
    }
  }

  return modelNames
}

export async function getModelFields(rwRoot: string, modelName: string) {
  const schema = await getSchemaDefinitions(rwRoot)

  const model = schema.datamodel.models.find(
    (model) => model.name === modelName
  )

  if (!model) {
    console.error('Could not find model', modelName)
    process.exit(1)
  }

  if (model.fieldMap) {
    console.log('---')
    console.log('fieldMap', model.fieldMap)
    console.log('---')
    process.exit(0)
  }

  // const parentProductField = model.fields.find((field) => field.name === 'parentProduct')
  // console.log('parentProductField', parentProductField)

  // console.log('fields', model.fields)
  model.fields.forEach((field) => {
    if (modelName === 'Product' && field.kind !== 'scalar') {
      console.log('field', field)
    }
  })

  return model.fields
}

export interface ModelNameVariants {
  modelName: string
  pluralModelName: string
  camelCaseModelName: string
  camelCasePluralModelName: string
  pascalCaseModelName: string
  pascalCasePluralModelName: string
}

export function getModelNameVariants(modelName: string): ModelNameVariants {
  return {
    modelName,
    pluralModelName: pluralize(modelName),
    camelCaseModelName: camelcase(modelName),
    camelCasePluralModelName: pluralize(camelcase(modelName)),
    pascalCaseModelName: pascalcase(modelName),
    pascalCasePluralModelName: pluralize(pascalcase(modelName)),
  }
}
