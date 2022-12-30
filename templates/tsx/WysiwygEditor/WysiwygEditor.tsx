import 'remirror/styles/all.css'

import {
  EditorComponent,
  Remirror,
  useRemirror,
  OnChangeHTML,
} from '@remirror/react'
import { BoldExtension, LinkExtension } from 'remirror/extensions'

import { FloatingLinkToolbar } from './FloatingLinkToolbar'
import { Menu } from './Menu'

interface Props {
  defaultValue: string
  className: string
  setValue: (value: string) => void
}

const WysiwygEditor: React.FC<Props> = ({
  defaultValue,
  className,
  setValue,
}) => {
  const { manager, state } = useRemirror({
    extensions: () => [new LinkExtension({ autoLink: true }), new BoldExtension()],
    content: defaultValue,
    selection: 'start',
    stringHandler: 'html',
  })

  return (
    <div className={'remirror-theme ' + className}>
      <Remirror manager={manager} initialContent={state}>
        <Menu />
        <EditorComponent />
        <FloatingLinkToolbar />
        <OnChangeHTML onChange={setValue} />
      </Remirror>
    </div>
  )
}

export default WysiwygEditor
