import { Link } from 'react-router'
import { PageHeader } from '../layout/PageHeader/PageHeader'
import { Body } from '../layout/layouts'

/** Shown in place of a page that threw while rendering, inside the app shell. */
export function RouteError() {
  return (
    <>
      <PageHeader title="Something went wrong" />
      <Body>
        <p>This screen hit an error. Reset demo restores the starting data.</p>
        <p>
          <Link to="/operations">Go to the Command Board</Link>
        </p>
      </Body>
    </>
  )
}
