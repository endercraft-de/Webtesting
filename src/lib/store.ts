/** Hand-over of result files to the next tool ("Weiter bearbeiten mit …"). */
export interface HandoffFile {
  name: string
  bytes: Uint8Array
  type: string
}

let pending: HandoffFile[] | null = null

export function setHandoff(files: HandoffFile[]) {
  pending = files
}

export function takeHandoff(): HandoffFile[] | null {
  const p = pending
  pending = null
  return p
}
