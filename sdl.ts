import fs from 'fs'
import path from 'path'

import { execaSync } from 'execa'
import type { DMMF } from '@prisma/generator-helper'
import { getModelFields, getModelNameVariants } from './schema'
import { prettify } from './prettier'

function getGeneratorDir(rwRoot: string, generatorDirName: string) {
  // TODO: read 'api' name from redwood.toml
  return path.join(rwRoot, 'api', 'src', generatorDirName)
}

/**
 * The goal is to be able to use RW's sdl generator without conflict with
 * existing services and sdl files. To do that we first move existing services
 * and sdl files to a temporary directory. Then we create new (empty)
 * directories that the Radmin services and sdl files will be generated into.
 *
 * In a later step we will restore the preexisting services and sdl files, so
 * we need to return the path to the temporary directory where they're located.
 *
 * If there already is an Radmin directory for services or sdl files we'll
 * have to remove those to avoid conflicts later
 *
 * @param rwRoot The root of the Redwood project
 * @returns Path to temporary directory with preexisting services or sdl files
 */
export function prepareGeneratorDir(rwRoot: string, generatorDirName: string) {
  const generatorDir = getGeneratorDir(rwRoot, generatorDirName)
  const radminGeneratorDir = path.join(generatorDir, 'radmin')
  const tmpName = generatorDir + '_' + Date.now()

  if (fs.existsSync(radminGeneratorDir)) {
    // TODO: Prompt if this is the first time radmin is run
    fs.rmSync(radminGeneratorDir, { force: true, recursive: true })
  }

  try {
    // rename api/src/<generatorDirName> to api/src/<generatorDirName>_923847289492
    fs.renameSync(generatorDir, tmpName)
  } catch (e) {
    console.error(`Failed to rename the old "${generatorDirName}" directory`)
    console.error(e)
    process.exit(1)
  }

  if (fs.existsSync(generatorDir)) {
    console.error(
      `${generatorDirName} dir already exists. Should have been renamed previously`
    )
    process.exit(1)
  }

  // create api/src/<generatorDirName>
  fs.mkdirSync(generatorDir, { recursive: true })

  return tmpName
}

export function findSearchField(modelName: string, fields: DMMF.Field[]) {
  let fieldNameForUsersEmail
  let fieldNameForUsersUserNameId
  let fieldNameForUsersUserName
  let fieldNameForUsersName
  let fieldNameForUsersFirstName
  let fieldNameForUsersFullName
  let fieldNameFromNonIdNoneUniqueString
  let fieldNameFromNonIdString
  let fieldNameFromString
  const fieldNameFromFirstField = fields[0]?.name

  for (const field of fields) {
    if (field.documentation?.includes('@radmin-search')) {
      // @radmin-search trumps everything. Return as soon as we find this
      return field.name
    }

    if (field.type === 'String') {
      if (
        modelName.toLowerCase().endsWith('user') ||
        modelName.toLowerCase().endsWith('users')
      ) {
        // For user tables we want to prioritize searching for email, name etc

        if (field.name.toLowerCase() === 'email') {
          fieldNameForUsersEmail = field.name
        } else if (field.name.toLowerCase() === 'username') {
          if (field.isUnique || field.isId) {
            fieldNameForUsersUserNameId = field.name
          } else {
            fieldNameForUsersUserName = field.name
          }
        } else if (field.name.toLowerCase() === 'name') {
          fieldNameForUsersName = field.name
        } else if (
          field.name.toLowerCase().replaceAll(/-|_/g, '') === 'firstname'
        ) {
          fieldNameForUsersFirstName = field.name
        } else if (
          field.name.toLowerCase().replaceAll(/-|_/g, '') === 'fullname'
        ) {
          fieldNameForUsersFullName = field.name
        }
      }

      if (
        !field.isId &&
        !field.isUnique &&
        !fieldNameFromNonIdNoneUniqueString
      ) {
        fieldNameFromNonIdNoneUniqueString = field.name
      } else if (!field.isId && !fieldNameFromNonIdString) {
        fieldNameFromNonIdString = field.name
      } else if (!fieldNameFromString) {
        fieldNameFromString = field.name
      }
    }
  }

  const searchField =
    fieldNameForUsersUserNameId ||
    fieldNameForUsersEmail ||
    fieldNameForUsersUserName ||
    fieldNameForUsersName ||
    fieldNameForUsersFirstName ||
    fieldNameForUsersFullName ||
    fieldNameFromNonIdNoneUniqueString ||
    fieldNameFromNonIdString ||
    fieldNameFromString ||
    fieldNameFromFirstField

  if (!searchField) {
    console.error("Couldn't find search field")
    process.exit(1)
  }

  return searchField
}

export async function generateSdls(
  rwRoot: string,
  modelNames: string[],
  appName: string
) {
  const serviceDir = getGeneratorDir(rwRoot, 'services')
  const graphqlDir = getGeneratorDir(rwRoot, 'graphql')

  console.log('generating sdls for', modelNames)

  try {
    for (const name of modelNames) {
      console.log('running sdl generator for', name)
      execaSync('yarn', ['rw', 'g', 'sdl', '--no-tests', name], {
        cwd: rwRoot,
      })

      const modelNames = getModelNameVariants(name, appName)
      const modelFields = await getModelFields(rwRoot, name)

      const sdlFilename = path.join(
        graphqlDir,
        modelNames.camelCasePluralModelName + '.sdl.ts'
      )

      const sdl = fs.readFileSync(sdlFilename, 'utf-8')

      let inModelType = false
      let inCreateModelInput = false
      let inUpdateModelInput = false

      fs.writeFileSync(
        sdlFilename,
        prettify(
          sdl
            .split('\n')
            .filter((row) => {
              // Remove fields that are skipped by @radmin-skip

              if (row === '  type ' + name + ' {') {
                inModelType = true
              } else if (row === '  input Create' + name + 'Input {') {
                inCreateModelInput = true
              } else if (row === '  input Update' + name + 'Input {') {
                inUpdateModelInput = true
              }

              if (row === '  }') {
                inModelType = false
                inCreateModelInput = false
                inUpdateModelInput = false
              }

              if (!inModelType && !inCreateModelInput && !inUpdateModelInput) {
                return true
              }

              const match = row.match(/    (\w+): /)

              if (!match) {
                return true
              }

              // Only keep the field if it's part of `modelFields`
              return modelFields.find((field) => field.name === match[1])
            })
            .join('\n')
            .replace(
              'type Query {',
              `type ${modelNames.pascalCaseModelName}Page {\n` +
                `  ${modelNames.camelCasePluralModelName}: [${modelNames.pascalCaseModelName}!]!\n` +
                `  count: BigInt!\n` +
                '}\n\n' +
                'type Query {\n' +
                ` ${modelNames.camelCaseModelName}Page(page: Int, q: String): ${modelNames.pascalCaseModelName}Page @requireAuth`
            ),
          'ts'
        )
      )

      const serviceFilename = path.join(
        serviceDir,
        modelNames.camelCasePluralModelName,
        modelNames.camelCasePluralModelName + '.ts'
      )

      const service = fs.readFileSync(serviceFilename, 'utf-8')

      const hasCreatedAtField = modelFields.find(
        (field) => field.name === 'createdAt'
      )
      const hasUpdatedAtField = modelFields.find(
        (field) => field.name === 'updatedAt'
      )

      // TODO: Extract this to a method.
      // Also look at "timestamp", "dateTime", "date", "time", "sort", "order", "name", "lastName", "fullName", "firstName"
      // In that order. Case insensitive
      const orderBy = hasCreatedAtField
        ? "orderBy: { createdAt: 'desc' },\n"
        : hasUpdatedAtField
        ? "orderBy: { updatedAt: 'desc' },\n"
        : ''
      const orderByRaw = hasCreatedAtField
        ? '      ORDER BY "createdAt"\n'
        : hasUpdatedAtField
        ? '      ORDER BY "updatedAt"\n'
        : ''

      const searchField = findSearchField(name, modelFields)

      if (!searchField) {
        console.error('Could not find a field to use for searches')
        process.exit(1)
      }

      fs.writeFileSync(
        serviceFilename,
        prettify(
          service
            .replace(
              "import { db } from 'src/lib/db'",
              "import { db } from 'src/lib/db'\n\n" +
                `const ${modelNames.capitalPluralModelName}_PER_PAGE = 10\n\n` +
                '\n' +
                'interface Args {\n' +
                '  page?: number\n' +
                '  q: string\n' +
                '}\n' +
                '\n' +
                'async function countRaw(q: string) {\n' +
                '  const result = await db.$queryRaw<{ count: bigint }[]>`\n' +
                '    SELECT COUNT(*)\n' +
                `    FROM "${modelNames.pascalCaseModelName}"\n` +
                `    WHERE "${searchField}" ILIKE \${'%' + q + '%'};\`\n` +
                '\n' +
                '  return result[0].count\n' +
                '}\n' +
                '\n' +
                `export const ${modelNames.camelCaseModelName}Page = ({ page = 1, q }: Args) => {\n` +
                `  const offset = (page - 1) * ${modelNames.capitalPluralModelName}_PER_PAGE\n` +
                `  let ${modelNames.camelCasePluralModelName}Promise\n` +
                '  let countPromise\n' +
                '\n' +
                '  if (q) {\n' +
                `    ${modelNames.camelCasePluralModelName}Promise = db.$queryRaw\`\n` +
                '      SELECT *\n' +
                `      FROM "${modelNames.pascalCaseModelName}"\n` +
                `      WHERE "${searchField}" ILIKE \${'%' + q + '%'}\n` +
                orderByRaw +
                `      LIMIT \${${modelNames.capitalPluralModelName}_PER_PAGE}\n` +
                '      OFFSET ${offset};`\n' +
                '\n' +
                '      countPromise = countRaw(q)\n' +
                '  } else {\n' +
                `    ${modelNames.camelCasePluralModelName}Promise = db.${modelNames.camelCaseModelName}.findMany({\n` +
                `      take: ${modelNames.capitalPluralModelName}_PER_PAGE,\n` +
                '      skip: offset,\n' +
                orderBy +
                '    })\n' +
                `    countPromise = db.${modelNames.camelCaseModelName}.count()\n` +
                '  }\n' +
                '\n' +
                `  return Promise.all([${modelNames.camelCasePluralModelName}Promise, countPromise]).then(\n` +
                `    ([${modelNames.camelCasePluralModelName}, count]) => {` +
                '      return {\n' +
                `        ${modelNames.camelCasePluralModelName},\n` +
                '        count,\n' +
                '      }\n' +
                '    }\n' +
                '  )\n' +
                '}\n'
            )
            .replaceAll(': (_obj, { root })', ': async (_obj, { root })')
            .replace(
              new RegExp(
                `return db.${modelNames.camelCaseModelName}.findUnique\\({ where(.*)\\.(\\w+)\\(\\)`,
                'g'
              ),
              (_match: string, one: string, two: string) => {
                const field = modelFields.find((field) => field.name === two)
                let maybeCheck = ''

                if (field?.isRequired) {
                  maybeCheck = `if (!maybe) { console.error('Could not resolve ${two}'); throw new Error('Could not resolve ${two}') }\n\n`
                }

                return (
                  `const maybe = await db.${modelNames.camelCaseModelName}.findUnique({ where${one}.${two}()\n\n` +
                  maybeCheck +
                  'return maybe'
                )
              }
            ),
          'ts'
        )
      )
    }
  } catch (e) {
    console.error("Couldn't generate sdls")
    console.error(e)
    process.exit(1)
  }
}

export function moveRadminSdls(rwRoot: string, tmpName: string) {
  const graphqlDir = getGeneratorDir(rwRoot, 'graphql')
  const radminServicesDir = path.join(tmpName, 'radmin')

  // Move all the newly generated sdls into api/src/graphql_239439403294890/radmin/
  console.log('rename from', graphqlDir, 'to', radminServicesDir)
  fs.renameSync(graphqlDir, radminServicesDir)

  // Move api/src/graphql_239439403294890 to /api/src/graphql
  console.log('rename from', tmpName, 'to', graphqlDir)
  fs.renameSync(tmpName, graphqlDir)
}
