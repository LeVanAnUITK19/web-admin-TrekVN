import { expect, it } from 'vitest'
import { recordedTrack } from './recordedTrack'

it('decodes the mobile polyline to GeoJSON longitude, latitude pairs', () => {
  expect(recordedTrack('_p~iF~ps|U_ulLnnqC_mqNvxq`@')).toEqual({
    type: 'LineString', coordinates: [[-120.2, 38.5], [-120.95, 40.7], [-126.453, 43.252]],
  })
})

it('ignores absent, truncated, out-of-range or single-point tracks', () => {
  for (const track of [undefined, '', '_', 'invalid!', '_p~iF~ps|U', '~~~~~~~~~~']) {
    expect(recordedTrack(track)).toBeNull()
  }
})
