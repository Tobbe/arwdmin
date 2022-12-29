import fs from 'fs'
import path from 'path'

import { findLastIndex } from './lib/array'
import { getModelFields, getModelNameVariants } from './schema'

export async function updateRoutes(rwRoot: string, modelNames: string[], appName: string) {
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
    // Remove existing arwdmin page routes. We will add them back later
    .filter((line) => {
      return !line.includes('path="/arwdmin"')
    })

  const hasArwdminLayoutImport = !!routesFileLines.find((line) =>
    /^\s*import ArwdminLayout from/.test(line)
  )

  let importIndex = 0

  if (!hasArwdminLayoutImport) {
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
      "import ArwdminLayout from 'src/layouts/ArwdminLayout'\n"
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
  const arwdminLayoutSetStartIndex = routesFileLines.findIndex((line) =>
    /<Set wrap={ArwdminLayout}>/.test(line)
  )

  if (arwdminLayoutSetStartIndex >= 0) {
    const arwdminLayoutSetEndIndex = routesFileLines.findIndex(
      (line, index) =>
        index > arwdminLayoutSetStartIndex && /<\/Set>/.test(line)
    )

    routesFileLines.splice(
      arwdminLayoutSetStartIndex,
      arwdminLayoutSetEndIndex - arwdminLayoutSetStartIndex + 1
    )
  }

  if (!routesFileLines.some((line) => line.includes('path="/"'))) {
    // No "home" route.
    // Let's just add a redirect to /arwdmin
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
      '      <Route path="/" redirect="/arwdmin" />'
    )
  }

  const routerEndIndex = routesFileLines.findIndex((line) =>
    /^\s*<\/Router>/.test(line)
  )
  const indent =
    '  ' + routesFileLines[routerEndIndex]?.match(/^(\s*)/)?.[1] ?? ''

  let arwdminRoutesBeginIndex = routerEndIndex - 1

  // If the "notfound" page is currently last, let's keep it there
  if (
    /^\s*<Route\s.*\snotfound\s/.test(routesFileLines[routerEndIndex - 1] || '')
  ) {
    arwdminRoutesBeginIndex--
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
    arwdminRoutesBeginIndex,
    0,
    `${indent}<Set wrap={ArwdminLayout}>`,
    `${indent}  <Route path="/arwdmin" page={ArwdminArwdminPage} name="arwdmin" />`,
    `${indent}  <Route path="/arwdminLogin" page={ArwdminArwdminLoginPage} name="arwdminLogin" />`,
    `${indent}  <Route path="/arwdminSignup" page={ArwdminArwdminSignupPage} name="arwdminSignup" />`,
    `${indent}  <Private unauthenticated="arwdminLogin">`,
    ...modelNames.map((name) => {
      const modelNames = getModelNameVariants(name, appName)
      const routeName = modelNames.camelCasePluralModelName
      const pascalName = modelNames.pascalCaseModelName
      const pascalPluralName = modelNames.pascalCasePluralModelName
      const idParamType = idTypes[name] !== 'String' ? ':' + idTypes[name] : ''

      return (
        `${indent}    <Route path="/arwdmin/${routeName}/new" page={Arwdmin${pascalName}New${pascalName}Page} name="arwdminNew${pascalName}" />\n` +
        `${indent}    <Route path="/arwdmin/${routeName}/{id${idParamType}}/edit" page={Arwdmin${pascalName}Edit${pascalName}Page} name="arwdminEdit${pascalName}" />\n` +
        `${indent}    <Route path="/arwdmin/${routeName}/{id${idParamType}}" page={Arwdmin${pascalName}${pascalName}Page} name="arwdmin${pascalName}" />\n` +
        `${indent}    <Route path="/arwdmin/${routeName}" page={Arwdmin${pascalName}${pascalPluralName}Page} name="arwdmin${pascalPluralName}" />`
      )
    }),
    `${indent}  </Private>`,
    `${indent}</Set>`
  )

  fs.writeFileSync(routesPath, routesFileLines.join('\n'))
}
