import fs from 'fs'
import path from 'path'

function getServicesDir(rwRoot: string) {
  // TODO: read 'api' name from redwood.toml
  return path.join(rwRoot, 'api', 'src', 'services')
}

export function moveArwdminServices(rwRoot: string, tmpName: string) {
  const servicesDir = getServicesDir(rwRoot)
  const arwdminServicesDir = path.join(tmpName, 'arwdmin')

  // Move all the newly generated services into api/src/services_239439403294890/arwdmin/
  console.log('rename from', servicesDir, 'to', arwdminServicesDir)
  fs.renameSync(servicesDir, arwdminServicesDir)

  // Move api/src/services_239439403294890 to /api/src/services
  console.log('rename from', tmpName, 'to', servicesDir)
  fs.renameSync(tmpName, servicesDir)
}
