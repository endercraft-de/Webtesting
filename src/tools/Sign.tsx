import { Editor } from '../components/Editor'
import { toolBySlug } from './registry'

export default function Sign() {
  return <Editor tool={toolBySlug('sign')!} signMode />
}
