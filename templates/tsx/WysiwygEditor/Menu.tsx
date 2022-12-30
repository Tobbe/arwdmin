import React from 'react'
import { useActive, useCommands, useChainedCommands } from '@remirror/react'

export const Menu = () => {
  // Using command chaining
  const active = useActive()
  const { toggleBold } = useCommands()
  const chained = useChainedCommands()

  return (
    <button
      disabled={!toggleBold.enabled()}
      onClick={() => {
        chained
          .toggleBold()
          .focus()
          .run()
      }}
      style={{ fontWeight: active.bold() ? 'bold' : undefined }}
      type="button"
    >
      B
    </button>
  )
}