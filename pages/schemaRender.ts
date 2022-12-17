import type { DMMF } from '@prisma/generator-helper'
import humanize from 'humanize-string'

function getComponent(
  type: string,
  field: DMMF.Field,
  enums: DMMF.DatamodelEnum[]
) {
  if (type === 'String') {
    const name = humanize(field.name).toLowerCase()

    if (field.documentation?.includes('@arwdmin-multiline')) {
      return 'TextAreaField'
    }

    if (
      field.documentation?.includes('@arwdmin-singleline') ||
      /\bshort\b/.test(name)
    ) {
      return 'TextField'
    }

    if (
      /\bdescription\b/.test(name) ||
      /\bdesc\b/.test(name) ||
      name === 'text' ||
      name === 'body' ||
      name === 'post' ||
      /\breply\b/.test(name) ||
      /\bmessage\b/.test(name) ||
      /\bcomment\b/.test(name) ||
      name === 'bio'
    ) {
      return 'TextAreaField'
    }

    return 'TextField'
  }

  switch (type) {
    case 'Enum':
      const enumValues = enums.find((e) => e.name === field.type)?.values

      if (!enumValues) {
        console.error("Couldn't find enum values for", field.type)
        process.exit(1)
      }

      return enumValues.length > 8 ? 'SelectField' : 'RadioField'
    case 'EnumList':
    case 'Boolean':
      return 'CheckboxField'
    case 'DateTime':
      return 'DatetimeLocalField'
    case 'Int':
      return 'NumberField'
    case 'Json':
      return 'TextAreaField'
    default:
      return 'TextField'
  }
}

function getDefaultProp(type: string) {
  switch (type) {
    case 'Boolean':
    case 'Enum':
    case 'EnumList':
      return 'defaultChecked'
    default:
      return 'defaultValue'
  }
}

function getValidation(type: string, field: DMMF.Field) {
  switch (type) {
    case 'Boolean':
    case 'Enum':
    case 'EnumList':
      return ''
    case 'Json':
      return `{{ valueAsJSON: true${
        field.isRequired ? ', required: true' : ''
      } }}`
    case 'Decimal':
    case 'Float':
      return `{{ valueAsNumber: true${
        field.isRequired ? ', required: true' : ''
      } }}`
    default:
      return field.isRequired ? '{{ required: true }}' : ''
  }
}

function getDeserializationFunction(type: string) {
  switch (type) {
    case 'DateTime':
      return 'formatDatetime'
    case 'Json':
      return 'JSON.stringify'
    default:
      return ''
  }
}

function getDisplayFunction(type: string) {
  switch (type) {
    case 'Enum':
    case 'EnumList':
      return 'formatEnum'
    case 'Boolean':
      return 'checkboxInputTag'
    case 'DateTime':
      return 'timeTag'
    case 'Json':
      return 'jsonDisplay'
    default:
      return undefined
  }
}

function getListDisplayFunction(type: string, field: DMMF.Field) {
  switch (type) {
    case 'Enum':
    case 'EnumList':
      return 'formatEnum'
    case 'Boolean':
      return 'checkboxInputTag'
    case 'DateTime':
      return 'timeTag'
    case 'Json':
      return 'jsonTruncate'
    default:
      if (field.isId) {
        return 'truncateId'
      } else if (field.name.endsWith('Id')) {
        return 'truncateMaybeId'
      }

      return 'truncate'
  }
}

function getSubData(
  type: string,
  field: DMMF.Field,
  enums: DMMF.DatamodelEnum[]
) {
  if (type === 'Enum' || type === 'EnumList') {
    const enumValues = enums.find((e) => e.name === field.type)?.values

    if (!enumValues) {
      console.error("Couldn't find any values for enum", field.type)
      process.exit(1)
    }

    return enumValues.map((enumValue) => ({
      value: enumValue.name,
      displayName: humanize(enumValue.name),
    }))
  }

  return undefined
}

export function getRenderDataFunction(
  modelFields: DMMF.Field[],
  enums: DMMF.DatamodelEnum[]
) {
  return (fieldName: string) => {
    const field = modelFields.find((f) => f.name === fieldName)

    if (!field) {
      console.error(
        "schemaRender.ts: Couldn't find the DMMF info for",
        fieldName
      )
      process.exit(1)
    }

    const isEnum = field.kind === 'enum'
    const isEnumList = isEnum && field.isList

    const type = isEnumList ? 'EnumList' : isEnum ? 'Enum' : field.type

    const component = getComponent(type, field, enums)
    const emptyAs =
      field.isRequired || component === 'CheckboxField' ? '' : 'emptyAs={null}'

    const description = field.documentation
      ?.split('\n')
      .filter((line) => !line.startsWith('@arwdmin'))
      .join(' ')

    return {
      displayName: humanize(fieldName),
      component,
      defaultProp: getDefaultProp(type),
      validation: getValidation(type, field),
      deserializeFunction: getDeserializationFunction(type),
      displayFunction: getDisplayFunction(type),
      listDisplayFunction: getListDisplayFunction(type, field),
      emptyAs,
      description,
      subData: getSubData(type, field, enums),
    }
  }
}
