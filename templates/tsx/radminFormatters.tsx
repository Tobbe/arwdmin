import React from 'react'

import humanize from 'humanize-string'
// TODO: Consider using sanitize-html for everything to get rid of
// string-strip-html. Should look at package sizes and runtime benchmarks
import sanitizeHtml from 'sanitize-html'
import { stripHtml } from 'string-strip-html'

export const formatEnum = (values: string | string[] | null | undefined) => {
  let output = ''

  if (Array.isArray(values)) {
    const humanizedValues = values.map((value) => humanize(value))
    output = humanizedValues.join(', ')
  } else if (typeof values === 'string') {
    output = humanize(values)
  }

  return output
}

export const jsonDisplay = (obj: unknown) => {
  return (
    <pre>
      <code>{JSON.stringify(obj, null, 2)}</code>
    </pre>
  )
}

/**
 * `checkForId` will check for any string that's more than 20 characters long
 * and that doesn't contain any whitespace. This should match UUIDs, CUIDs and
 * NanoIDs.
 */
export const truncate = (
  value: string | number,
  { isId, checkForId }: { isId?: boolean; checkForId?: boolean } = {}
) => {
  // stripHtml isn't any kind of security measure. React is already doing
  // that for us. stripHtml is just a way to remove text that doesn't
  // provide any valuable information when reading the truncated value
  const output = stripHtml(value?.toString() ?? '').result

  let maxLength = 45
  let substrLength = 45

  if (isId || (checkForId && output.length > 20 && !/\s/.test(output))) {
    maxLength = 6
    substrLength = 5
  }

  if (output.length > maxLength) {
    return (
      <span title={output}>{output.substring(0, substrLength)}&hellip;</span>
    )
  }

  return <>{output}</>
}

export const truncateId = (value: string | number) => {
  return truncate(value, { isId: true })
}

export const truncateMaybeId = (value: string | number) => {
  return truncate(value, { checkForId: true })
}

export const jsonTruncate = (obj: unknown) => {
  return truncate(JSON.stringify(obj, null, 2))
}

const YEAR_IN_MS = 365 * 24 * 60 * 60 * 1000
const MONTH_IN_MS = 30 * 24 * 60 * 60 * 1000
const DAY_IN_MS = 24 * 60 * 60 * 1000
const HOUR_IN_MS = 60 * 60 * 1000

export const timeTag = (dateTime: string | undefined | null) => {
  let output: string | JSX.Element = ''

  if (dateTime) {
    let humanTime
    const date = new Date(dateTime)
    const now = new Date()
    const dateDiff = now.getTime() - date.getTime()
    const absDateDiff = Math.abs(dateDiff)

    if (absDateDiff > 11 * MONTH_IN_MS) {
      const years = Math.round(dateDiff / YEAR_IN_MS)

      if (years === 1) {
        humanTime = 'One year ago'
      } else if (years === -1) {
        humanTime = 'In one year'
      } else if (years > 1) {
        humanTime = Math.abs(years) + ' years ago'
      } else {
        humanTime = 'In ' + years + ' years'
      }
    } else if (absDateDiff > 25 * DAY_IN_MS) {
      const months = Math.round(dateDiff / MONTH_IN_MS)

      if (months === 1) {
        humanTime = 'One month ago'
      } else if (months === -1) {
        humanTime = 'In one month'
      } else if (months > 1) {
        humanTime = months + ' months ago'
      } else {
        humanTime = 'In ' + months + ' months'
      }
    } else if (absDateDiff > 20 * HOUR_IN_MS) {
      const days = Math.round(dateDiff / DAY_IN_MS)

      if (days === 1) {
        humanTime = 'One day ago'
      } else if (days === -1) {
        humanTime = 'In one day'
      } else if (days > 1) {
        humanTime = days + ' days ago'
      } else {
        humanTime = 'In ' + days + ' days'
      }
    } else {
      humanTime =
        ('0' + date.getHours()).slice(-2) +
        ':' +
        ('0' + date.getMinutes()).slice(-2)
    }

    output = (
      <time dateTime={dateTime} title={dateTime}>
        {humanTime}
      </time>
    )
  }

  return output
}

export const checkboxInputTag = (checked: boolean | null | undefined) => {
  return <input type="checkbox" checked={!!checked} disabled />
}

export const sanitizedHtml = (text: string | null | undefined) => {
  if (!text) {
    return null
  }

  const sanitizedText = sanitizeHtml(text)
  return <div dangerouslySetInnerHTML={{ __html: sanitizedText }} />
}

export const relation = (field: Record<string, string | number>) => {
  const keys = Object.keys(field)
  const humanReadable = keys.find((key) => key !== 'id' && key !== '__typename')
  if (humanReadable) {
    return (
      <span>
        {truncateId(field.id)} - {field[humanReadable]}
      </span>
    )
  } else {
    return <span>{field.id}</span>
  }
}
