import fs from 'fs'
import path from 'path'

import { execaSync } from 'execa'
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
 * directories that the arwdmin services and sdl files will be generated into.
 *
 * In a later step we will restore the preexisting services and sdl files, so
 * we need to return the path to the temporary directory where they're located.
 *
 * If there already is an arwdmin directory for services or sdl files we'll
 * have to remove those to avoid conflicts later
 *
 * @param rwRoot The root of the Redwood project
 * @returns Path to temporary directory with preexisting services or sdl files
 */
export function prepareGeneratorDir(rwRoot: string, generatorDirName: string) {
  const generatorDir = getGeneratorDir(rwRoot, generatorDirName)
  const arwdminGeneratorDir = path.join(generatorDir, 'arwdmin')
  const tmpName = generatorDir + '_' + Date.now()

  if (fs.existsSync(arwdminGeneratorDir)) {
    // TODO: Prompt if this is the first time arwdmin is run
    fs.rmSync(arwdminGeneratorDir, { force: true, recursive: true })
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

export async function generateSdls(rwRoot: string, modelNames: string[]) {
  const serviceDir = getGeneratorDir(rwRoot, 'services')
  const graphqlDir = getGeneratorDir(rwRoot, 'graphql')

  console.log('generating sdls for', modelNames)

  try {
    for (const name of modelNames) {
      console.log('running sdl generator for', name)
      execaSync('yarn', ['rw', 'g', 'sdl', '--no-tests', name], {
        cwd: rwRoot,
      })

      const modelNames = getModelNameVariants(name)
      const modelFields = await getModelFields(rwRoot, name)

      const sdlFilename = path.join(
        graphqlDir,
        modelNames.camelCasePluralModelName + '.sdl.ts'
      )

      const sdl = fs.readFileSync(sdlFilename, 'utf-8')

      fs.writeFileSync(
        sdlFilename,
        prettify(
          sdl.replace(
            'type Query {',
            `type ${modelNames.pascalCaseModelName}Page {\n` +
              `  ${modelNames.camelCasePluralModelName}: [${modelNames.pascalCaseModelName}!]!\n` +
              `  count: Int!\n` +
              '}\n\n' +
              'type Query {\n' +
              ` ${modelNames.camelCaseModelName}Page(page: Int): ${modelNames.pascalCaseModelName}Page @requireAuth`
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

      fs.writeFileSync(
        serviceFilename,
        prettify(
          service
            .replace(
              "import { db } from 'src/lib/db'",
              "import { removeNulls } from '@redwoodjs/api'\n\n" +
              "import { db } from 'src/lib/db'\n\n" +
              `const ${modelNames.capitalModelName}_PER_PAGE = 5\n\n` +
              `export const ${modelNames.camelCaseModelName}Page = ({ page = 1 }) => {\n` +
              `  const offset = (page - 1) * ${modelNames.capitalModelName}_PER_PAGE\n` +
              '\n' +
              `  const ${modelNames.camelCasePluralModelName}Promise = db.${modelNames.camelCaseModelName}.findMany({\n` +
              `    take: ${modelNames.capitalModelName}_PER_PAGE,\n` +
              '    skip: offset,\n' +
              "    orderBy: { createdAt: 'desc' },\n" +
              '  })\n' +
              `  const countPromise = db.${modelNames.camelCaseModelName}.count()\n` +
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
            .replace(
              /update\({(.*?)data: input,/gs,
              'update({$1data: removeNulls(input),'
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

export function moveArwdminSdls(rwRoot: string, tmpName: string) {
  const graphqlDir = getGeneratorDir(rwRoot, 'graphql')
  const arwdminServicesDir = path.join(tmpName, 'arwdmin')

  // Move all the newly generated sdls into api/src/graphql_239439403294890/arwdmin/
  console.log('rename from', graphqlDir, 'to', arwdminServicesDir)
  fs.renameSync(graphqlDir, arwdminServicesDir)

  // Move api/src/graphql_239439403294890 to /api/src/graphql
  console.log('rename from', tmpName, 'to', graphqlDir)
  fs.renameSync(tmpName, graphqlDir)
}
