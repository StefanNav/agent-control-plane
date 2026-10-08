import { render, screen } from '@testing-library/react'
import { PageHeader } from './PageHeader'

test('title is the only h1, with breadcrumb, people and actions', () => {
  render(
    <PageHeader
      breadcrumb="Operations / Medications"
      title="Med Rec Agent"
      status="Draft · since 06 Nov"
      idLine="v1.3.0 · SOP v1.3.1 · AGT-0123"
      people={[
        { role: 'Owner', name: 'Marcus' },
        { role: 'Sponsor', name: 'Priya' },
      ]}
      actions={<button>Controls</button>}
    />,
  )
  expect(screen.getAllByRole('heading', { level: 1 })).toHaveLength(1)
  expect(screen.getByRole('heading', { level: 1 })).toHaveTextContent('Med Rec Agent')
  expect(screen.getByText('Operations / Medications')).toBeInTheDocument()
  expect(screen.getByText('v1.3.0 · SOP v1.3.1 · AGT-0123')).toBeInTheDocument()
  const owner = screen.getByText('Owner')
  expect(owner.textContent).toBe('Owner')
  expect(screen.getByText('Marcus')).toBeInTheDocument()
  expect(screen.getByRole('button', { name: 'Controls' })).toBeInTheDocument()
})
