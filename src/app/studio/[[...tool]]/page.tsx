import { metadata, viewport } from 'next-sanity/studio'
import Studio from './Studio'

export { metadata, viewport }
export const dynamic = 'force-static'

export default function StudioPage() {
  return <Studio />
}
