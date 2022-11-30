import fs from 'fs'
import path from 'path'

import { findLastIndex } from './lib/array'
import { getModelNameVariants } from './schema'

export function updateRoutes(rwRoot: string, modelNames: string[]) {
  let routesPath = path.join(rwRoot, 'web', 'src', 'Routes.tsx')

  if (!fs.existsSync(routesPath)) {
    console.error('No Routes.tsx file found')
    process.exit(1)
    // TODO: For when we support JS projects:
    // routesPath = path.join(rwRoot, "web", "src", "Routes.js");
  }

  console.log('About to update', routesPath)

  const routesFileLines = fs.readFileSync(routesPath).toString().split('\n')

  const hasArwdminLayoutImport = !!routesFileLines.find((line) =>
    /^\s*import ArwdminLayout from/.test(line)
  )

  if (!hasArwdminLayoutImport) {
    // First look for Layout imports
    let existingImportIndex = findLastIndex(routesFileLines, (line) =>
      /^\s*import .+Layout\b.* from/.test(line)
    )

    if (existingImportIndex === -1) {
      // Didn't find any Layout imports. Let's look for any kind of import
      existingImportIndex = findLastIndex(routesFileLines, (line) =>
        /^\s*import .+ from/.test(line)
      )
    }

    routesFileLines.splice(
      existingImportIndex + 1,
      0,
      "import ArwdminLayout from 'src/layouts/ArwdminLayout'"
    )
  }

  const rwjsRouterImportIndex = routesFileLines.findIndex((line) =>
    /from '@redwoodjs\/router'/.test(line)
  )
  const rwjsRouterImportLine = routesFileLines[rwjsRouterImportIndex]

  if (!rwjsRouterImportLine) {
    console.error("Couldn't find @redwoodjs/router import")
    process.exit(1)
  }

  if (!/\bSet\b/.test(rwjsRouterImportLine)) {
    const insertIndex = rwjsRouterImportLine.lastIndexOf('}')
    routesFileLines[rwjsRouterImportIndex] = rwjsRouterImportLine
      .split('')
      .splice(insertIndex, 0, ', Set ')
      .join('')
  }

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

  routesFileLines.splice(
    arwdminRoutesBeginIndex,
    0,
    `${indent}<Set wrap={ArwdminLayout}>`,
    ...modelNames.map((name) => {
      const modelNames = getModelNameVariants(name)
      const routeName = modelNames.camelCasePluralModelName
      const pascalName = modelNames.pascalCaseModelName
      const pascalPluralName = modelNames.pascalCasePluralModelName
      return `${indent}  <Route path="/arwdmin/${routeName}/new" page={Arwdmin${pascalName}New${pascalName}Page} name="arwdminNew${pascalName}" />\n` +
        `${indent}  <Route path="/arwdmin/${routeName}/{id}/edit" page={Arwdmin${pascalName}${pascalName}Page} name="arwdminEdit${pascalName}" />\n` +
        `${indent}  <Route path="/arwdmin/${routeName}/{id}" page={Arwdmin${pascalName}${pascalName}Page} name="arwdmin${pascalName}" />\n` +
        `${indent}  <Route path="/arwdmin/${routeName}" page={Arwdmin${pascalName}${pascalPluralName}Page} name="arwdmin${pascalPluralName}" />`
    }),
    `${indent}</Set>`
  )

  fs.writeFileSync(routesPath, routesFileLines.join('\n'))
}
