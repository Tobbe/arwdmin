import camelcase from 'camelcase'
import fs from 'fs'
import path from 'path'

import { findLastIndex } from './lib/array'
import { getModelFields, getModelNameVariants } from './schema'

export async function updateRoutes(
  rwRoot: string,
  modelNames: string[],
  appName: string
) {
  let routesPath = path.join(rwRoot, 'web', 'src', 'Routes.tsx')

  if (!fs.existsSync(routesPath)) {
    console.error('No Routes.tsx file found')
    process.exit(1)
    // TODO: For when we support JS projects:
    // routesPath = path.join(rwRoot, "web", "src", "Routes.js");
  }

  console.log('About to update', routesPath)

  const routesFileLines = fs
    .readFileSync(routesPath, 'utf-8')
    .split('\n')
    // Remove existing Radmin page routes. We will add them back later
    .filter((line) => {
      return !line.includes('path="/radmin"')
    })

  const hasRadminLayoutImport = !!routesFileLines.find((line) =>
    /^\s*import RadminLayout from/.test(line)
  )

  let importIndex = 0

  if (!hasRadminLayoutImport) {
    // First look for Layout imports
    let existingImportIndex = findLastIndex(routesFileLines, (line) =>
      /^\s*import .+Layout\b.* from 'src\/layouts/.test(line)
    )
    importIndex = existingImportIndex + 1

    if (existingImportIndex === -1) {
      // Didn't find any Layout imports. Let's look for src/ imports
      existingImportIndex = findLastIndex(routesFileLines, (line) =>
        /^\s*import .+ from 'src\//.test(line)
      )
      importIndex = existingImportIndex + 1
    }

    if (existingImportIndex === -1) {
      // Didn't find any src/ imports. Let's look for relative imports
      existingImportIndex = routesFileLines.findIndex((line) =>
        /^\s*import .+ from '\./.test(line)
      )
      importIndex = Math.max(0, existingImportIndex)
    }

    routesFileLines.splice(
      importIndex,
      0,
      "import RadminLayout from 'src/layouts/RadminLayout'\n"
    )
  }

  const rwjsRouterImportIndex = routesFileLines.findIndex((line) =>
    /from '@redwoodjs\/router'/.test(line)
  )
  let rwjsRouterImportLine = routesFileLines[rwjsRouterImportIndex]

  if (!rwjsRouterImportLine) {
    console.error("Couldn't find @redwoodjs/router import")
    process.exit(1)
  }

  if (!/\bSet\b/.test(rwjsRouterImportLine)) {
    let insertIndex = rwjsRouterImportLine.lastIndexOf('}')
    let space = false
    if (rwjsRouterImportLine[insertIndex - 1] === ' ') {
      space = true
      insertIndex -= 1
    }

    routesFileLines[rwjsRouterImportIndex] =
      rwjsRouterImportLine.slice(0, insertIndex) +
      ', Set' +
      (space ? '' : ' ') +
      rwjsRouterImportLine.slice(insertIndex)
    rwjsRouterImportLine = routesFileLines[rwjsRouterImportIndex] || ''
  }

  if (!/\bPrivate\b/.test(rwjsRouterImportLine)) {
    let insertIndex = rwjsRouterImportLine.lastIndexOf('}')
    let space = false
    if (rwjsRouterImportLine[insertIndex - 1] === ' ') {
      space = true
      insertIndex -= 1
    }
    routesFileLines[rwjsRouterImportIndex] =
      rwjsRouterImportLine.slice(0, insertIndex) +
      ', Private' +
      (space ? '' : ' ') +
      rwjsRouterImportLine.slice(insertIndex)
  }

  // Look for existing model pages and remove all of them. Don't want to have
  // routes to models that might have been removed/renamed. And we don't want
  // duplicate routes for models that still exist when we regenerate all routes
  const radminLayoutSetStartIndex = routesFileLines.findIndex((line) =>
    /<Set wrap={RadminLayout}>/.test(line)
  )

  if (radminLayoutSetStartIndex >= 0) {
    const radminLayoutSetEndIndex = routesFileLines.findIndex(
      (line, index) =>
        index > radminLayoutSetStartIndex && /<\/Set>/.test(line)
    )

    routesFileLines.splice(
      radminLayoutSetStartIndex,
      radminLayoutSetEndIndex - radminLayoutSetStartIndex + 1
    )
  }

  if (!routesFileLines.some((line) => line.includes('path="/"'))) {
    // No "home" route.
    // Let's just add a redirect to /radmin
    const routerStartIndex = routesFileLines.findIndex((line) =>
      /^\s*<Router.*>\s*$/.test(line)
    )

    if (routerStartIndex === -1) {
      console.error("Couldn't find where your routes start")
      process.exit(1)
    }

    // TODO: Dynamic indent instead of hardcoded spaces
    routesFileLines.splice(
      routerStartIndex + 1,
      0,
      '      <Route path="/" redirect="/radmin" />'
    )
  }

  const routerEndIndex = routesFileLines.findIndex((line) =>
    /^\s*<\/Router>/.test(line)
  )
  const indent =
    '  ' + routesFileLines[routerEndIndex]?.match(/^(\s*)/)?.[1] ?? ''

  let radminRoutesBeginIndex = routerEndIndex - 1

  // If the "notfound" page is currently last, let's keep it there
  if (
    /^\s*<Route\s.*\snotfound\s/.test(routesFileLines[routerEndIndex - 1] || '')
  ) {
    radminRoutesBeginIndex--
  }

  const idTypes: Record<string, string> = {}
  for (const name of modelNames) {
    const fields = await getModelFields(rwRoot, name)
    const idField = fields.find((field) => field.isId)

    if (!idField?.type) {
      console.error("Couldn't find the id field type for", name)
      process.exit(1)
    }

    idTypes[name] = idField?.type
  }

  routesFileLines.splice(
    radminRoutesBeginIndex,
    0,
    `${indent}<Set wrap={RadminLayout}>`,
    `${indent}  <Route path="/radmin" page={RadminRadminPage} name="radmin" />`,
    `${indent}  <Route path="/radminLogin" page={RadminRadminLoginPage} name="radminLogin" />`,
    `${indent}  <Route path="/radminSignup" page={RadminRadminSignupPage} name="radminSignup" />`,
    `${indent}  <Private unauthenticated="radminLogin">`,
    ...modelNames.map((name) => {
      const modelNames = getModelNameVariants(name, appName)
      const routeName =
        modelNames.modelName === 'RadminUser'
          ? camelcase(appName) + 'Users'
          : modelNames.camelCasePluralModelName
      const pascalName = modelNames.pascalCaseModelName
      const pascalPluralName = modelNames.pascalCasePluralModelName
      const idParamType = idTypes[name] !== 'String' ? ':' + idTypes[name] : ''

      return (
        `${indent}    <Route path="/radmin/${routeName}/new" page={Radmin${pascalName}New${pascalName}Page} name="radminNew${pascalName}" />\n` +
        `${indent}    <Route path="/radmin/${routeName}/{id${idParamType}}/edit" page={Radmin${pascalName}Edit${pascalName}Page} name="radminEdit${pascalName}" />\n` +
        `${indent}    <Route path="/radmin/${routeName}/{id${idParamType}}" page={Radmin${pascalName}${pascalName}Page} name="radmin${pascalName}" />\n` +
        `${indent}    <Route path="/radmin/${routeName}" page={Radmin${pascalName}${pascalPluralName}Page} name="radmin${pascalPluralName}" />`
      )
    }),
    `${indent}  </Private>`,
    `${indent}</Set>`
  )

  fs.writeFileSync(routesPath, routesFileLines.join('\n'))
}
