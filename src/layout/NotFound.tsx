import { Link } from 'react-router'
import { PageHeader } from './PageHeader/PageHeader'
import { Body } from './layouts'

export function NotFound() {
  return (
    <>
      <PageHeader title="Page not found" />
      <Body>
        <p>This page isn't part of the prototype.</p>
        <p>
          <Link to="/operations">Go to the Command Board</Link>
        </p>
      </Body>
    </>
  )
}
