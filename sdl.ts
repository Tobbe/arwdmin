import fs from 'fs'
import path from 'path'

import { execaSync } from 'execa'
import { getModelNameVariants } from './schema'
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

  console.log('generating sdls for', modelNames)

  try {
    for (const name of modelNames) {
      console.log('running sdl generator for', name)
      execaSync('yarn', ['rw', 'g', 'sdl', '--no-tests', name], {
        cwd: rwRoot,
      })

      const modelNames = getModelNameVariants(name)

      const serviceFilename = path.join(
        serviceDir,
        modelNames.camelCasePluralModelName,
        modelNames.camelCasePluralModelName + '.ts'
      )

      const service = fs.readFileSync(serviceFilename, 'utf8')

      fs.writeFileSync(
        serviceFilename,
        prettify(service
          .replace(
            'import { db }',
            "import { removeNulls } from '@redwoodjs/api'\n\nimport { db }"
          )
          .replace(
            /update\({(.*?)data: input,/gs,
            'update({$1data: removeNulls(input),'
          )
          .replaceAll(': (_obj, { root })', ': async (_obj, { root })')
          .replace(
            new RegExp(
              `return db.${modelNames.camelCaseModelName}.findUnique\\({ where(.*)`
            , 'g'),
            `const maybe = await db.${modelNames.camelCaseModelName}.findUnique({ where$1\n\n` +
              `if (!maybe) { throw new Error('Could not resolve') }\n\n` +
              `return maybe`
          ), 'ts')
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
