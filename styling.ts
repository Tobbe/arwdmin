import fs from 'fs'
import path from 'path'

export function addMainStyles(rwRoot: string) {
  // TODO: read 'web' name from redwood.toml
  const cssPath = path.join(rwRoot, 'web', 'src', 'radmin.css')

  fs.copyFileSync('./templates/css/radmin.css', cssPath)

  // TODO: Support App.js
  const appPath = path.join(rwRoot, 'web', 'src', 'App.tsx')
  const app = fs
    .readFileSync(appPath, 'utf-8')
    .replace("import './radmin.css'\n", '')
    .replace(
      "import './index.css'",
      "import './radmin.css'\nimport './index.css'"
    )
  fs.writeFileSync(appPath, app)
}
