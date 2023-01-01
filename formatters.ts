import fs from 'fs'
import path from 'path'

import { execaSync } from 'execa'

export function addRadminFormatters(rwRoot: string) {
  // TODO: read 'web' name from redwood.toml
  const libPath = path.join(rwRoot, 'web', 'src', 'lib')
  const formattersPath = path.join(libPath, 'radminFormatters.tsx')

  fs.mkdirSync(libPath, { recursive: true })
  fs.copyFileSync('./templates/tsx/radminFormatters.tsx', formattersPath)

  // The formatters use string-strip-html, and 8.3.0 is the last version that's
  // not only ESM
  execaSync('yarn', ['add', 'string-strip-html@8.3.0', 'sanitize-html'], {
    cwd: path.join(rwRoot, 'web'),
  })
  execaSync('yarn', ['add', '-D', '@types/sanitize-html'], {
    cwd: path.join(rwRoot, 'web'),
  })
}
