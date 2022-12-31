import fs from 'fs'
import path from 'path'

import { execaSync } from 'execa'

import prismaSdk from '@prisma/sdk'
import camelcase from 'camelcase'
import decamelize from 'decamelize'
import pascalcase from 'pascalcase'
import humanize from 'humanize-string'

import { pluralize } from './lib/rwPluralize'
import { kebabCase } from './lib/kebabCase'

const { getDMMF } = prismaSdk

export function copyPrismaSchema(baseProjectRoot: string, rwRoot: string) {
  const schemaPath = path.join(baseProjectRoot, 'api', 'db', 'schema.prisma')
  const schemaDestPath = path.join(rwRoot, 'api', 'db', 'schema.prisma')

  // copyFileSync will overwrite by default
  fs.copyFileSync(schemaPath, schemaDestPath)

  execaSync('yarn', ['rw', 'prisma', 'generate'], {
    cwd: rwRoot,
  })
}

/**
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
    if (model.documentation === '@radmin skip') {
      console.log('Skipping', model.name)
    } else {
      modelNames.push(model.name)
    }
  }

  return modelNames
}

export async function getModelFields(rwRoot: string, modelName: string) {
  const schema = await getSchemaDefinitions(rwRoot)

  // console.log('schema', schema)

  const model = schema.datamodel.models.find(
    (model) => model.name === modelName
  )

  if (!model) {
    console.error('Could not find model', modelName)
    process.exit(1)
  }

  // const parentProductField = model.fields.find((field) => field.name === 'parentProduct')
  // console.log('parentProductField', parentProductField)

  // console.log('fields', model.fields)
  if (modelName === 'Payment') {
    // console.log('model', model)
    // model.fields.forEach((field) => {
    //   console.log('field', field)
    // })
  }

  return model.fields
}

export async function getEnums(rwRoot: string) {
  const schema = await getSchemaDefinitions(rwRoot)

  return schema.datamodel.enums
}

export interface ModelNameVariants {
  modelName: string
  pluralModelName: string
  camelCaseModelName: string
  camelCasePluralModelName: string
  pascalCaseModelName: string
  pascalCasePluralModelName: string
  capitalModelName: string
  capitalPluralModelName: string
  kebabModelName: string
  humanizedPlural: string
  humanizedName: string
}

export function getModelNameVariants(
  modelName: string,
  appName: string
): ModelNameVariants {
  let humanizedName
  let humanizedPlural

  if (modelName === 'RadminUser') {
    humanizedName = humanize(appName) + ' user'
    humanizedPlural = humanizedName + 's'
  } else {
    humanizedName = humanize(modelName)
    humanizedPlural = humanize(pluralize(modelName))
  }

  return {
    modelName,
    pluralModelName: pluralize(modelName),
    camelCaseModelName: camelcase(modelName),
    camelCasePluralModelName: pluralize(camelcase(modelName)),
    pascalCaseModelName: pascalcase(modelName),
    pascalCasePluralModelName: pluralize(pascalcase(modelName)),
    capitalModelName: decamelize(modelName).toUpperCase(),
    capitalPluralModelName: decamelize(pluralize(modelName)).toUpperCase(),
    kebabModelName: kebabCase(modelName),
    humanizedPlural,
    humanizedName,
  }
}