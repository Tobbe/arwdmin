import { format } from 'prettier'

export const prettify = (renderedTemplate: string, language: 'ts'|'js') => {
  // https://prettier.io/docs/en/options.html#parser
  const parser = {
    'js': 'babel',
    'ts': 'babel-ts',
  }[language]

  return format(renderedTemplate, {
    parser,
    trailingComma: 'es5',
    bracketSpacing: true,
    tabWidth: 2,
    semi: false,
    singleQuote: true,
    arrowParens: 'always',
  })
}