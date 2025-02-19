/**
 * @jest-environment jsdom
 */
import { FaasReactClient } from '@faasjs/react'
import { render, screen } from '@testing-library/react'
import { Description } from '../../Description'

describe('Description/faas', () => {
  let originalFetch: any

  beforeEach(() => {
    originalFetch = window.fetch
    window.fetch = jest.fn(async () => {
      return Promise.resolve({
        status: 200,
        headers: new Map([['Content-Type', 'application/json']]),
        text: async () => Promise.resolve('{"data":{"test":"value"}}')
      }) as unknown as Promise<Response>
    })
    FaasReactClient({ domain: 'test' })
  })

  afterEach(() => {
    window.fetch = originalFetch
  })

  it('with faas', async () => {
    render(<Description
      items={ [{ id: 'test' }] }
      faasData={ { action: 'test' } }
    />)

    expect(await screen.findByText('Test')).toBeInTheDocument()
    expect(await screen.findByText('value')).toBeInTheDocument()
  })
})
