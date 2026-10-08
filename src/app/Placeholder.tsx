import { Notice } from '../design-system'
import { PageHeader } from '../layout/PageHeader/PageHeader'
import { Body } from '../layout/layouts'
import type { RouteDef } from './routes'

/** Stand-in for a route until its phase builds the real screen. Lists the frames it will show. */
export function Placeholder({ route }: { route: RouteDef }) {
  const frames = route.frames.length ? `Frames ${route.frames.join(' · ')}` : 'Composed screen (no frame)'
  return (
    <>
      <PageHeader breadcrumb={route.path} title={route.title} idLine={frames} />
      <Body>
        <Notice mark="none" lead={`Built in Phase ${route.phase}.`}>
          This placeholder lists the frames this route will show.
        </Notice>
      </Body>
    </>
  )
}
