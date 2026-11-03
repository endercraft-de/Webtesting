import { Editor } from '../components/Editor'
import { toolBySlug } from './registry'

export default function Edit() {
  return <Editor tool={toolBySlug('edit')!} />
}
