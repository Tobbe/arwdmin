import ejs from 'ejs'

import { prettify } from "./prettier";

export function ejsRender(template: string, data?: any) {
  // Return type of render depends on opts.async. We're not specifying it, and
  // it defaults to `false`, so we know the return type will be `string`
  return prettify(ejs.render(template, data, {}) as string, 'ts')
}
