import fs from 'fs'
import path from 'path'

export function updateRedwoodToml(rwRoot: string, appName: string) {
  const tomlPath = path.join(rwRoot, 'redwood.toml')
  const redwoodToml = fs
    .readFileSync('tomlPath', 'utf-8')
    // Only update if it's still the default
    .replace(/^ title = "Redwood App"$/, `title = "${appName}"`)
  fs.writeFileSync(tomlPath, redwoodToml)
}
