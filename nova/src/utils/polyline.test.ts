import { decodePolyline } from './polyline';

describe('decodePolyline', () => {
  it('decodes the reference precision-5 polyline', () => {
    // Google's documented example: (38.5, -120.2), (40.7, -120.95), (43.252, -126.453)
    const decoded = decodePolyline('_p~iF~ps|U_ulLnnqC_mqNvxq`@', 5);

    expect(decoded).toHaveLength(3);
    expect(decoded[0].latitude).toBeCloseTo(38.5, 5);
    expect(decoded[0].longitude).toBeCloseTo(-120.2, 5);
    expect(decoded[2].latitude).toBeCloseTo(43.252, 5);
    expect(decoded[2].longitude).toBeCloseTo(-126.453, 5);
  });

  it('honours precision 6, which is what Nova requests', () => {
    // Same payload, one more decimal place: every value shifts by a factor of ten.
    const decoded = decodePolyline('_p~iF~ps|U', 6);

    expect(decoded).toHaveLength(1);
    expect(decoded[0].latitude).toBeCloseTo(3.85, 6);
    expect(decoded[0].longitude).toBeCloseTo(-12.02, 6);
  });

  it('returns nothing for an empty string', () => {
    expect(decodePolyline('')).toEqual([]);
  });
});
