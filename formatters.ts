import fs from 'fs'
import path from 'path'

export function addArwdminFormatters(rwRoot: string) {
  // TODO: read 'web' name from redwood.toml
  const libPath = path.join(rwRoot, 'web', 'src', 'lib')
  const formattersPath = path.join(libPath, 'arwdminFormatters.tsx')

  fs.copyFileSync('./templates/tsx/arwdminFormatters.tsx', formattersPath)
}
