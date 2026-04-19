import { renderToStaticMarkup } from 'react-dom/server'
import { describe, expect, it } from 'vitest'
import DriverTable from '../src/components/DriverTable.jsx'

describe('DriverTable', () => {
  it('renders rank movement indicators for live reranking', () => {
    const html = renderToStaticMarkup(
      <DriverTable
        candidates={[
          {
            id: 'DRV-201',
            name: 'D. Okafor',
            status: 'Available',
            currentCity: 'Phoenix, AZ',
            hosDriveHours: 9.8,
            emptyMiles: 42,
            projectedCpm: 1.78,
            onTimeConfidence: 94,
            score: 88,
            truckId: 'TP-204',
            laneFocus: 'Southwest -> Texas',
            rankDelta: 2,
          },
        ]}
        selectedDriverId="DRV-201"
        onSelect={() => {}}
        recommendedId="DRV-201"
      />,
    )

    expect(html).toContain('Rank move')
    expect(html).toContain('+2')
    expect(html).toContain('Best fit')
  })
})
