import camelcase from 'camelcase'

export function kebabCase(str: string) {
  return camelcase(str)
    .replace(/([a-z])([A-Z])/g, '$1-$2')
    .toLowerCase()
}
