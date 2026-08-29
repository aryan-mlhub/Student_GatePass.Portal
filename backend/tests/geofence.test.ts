import { describe, it, expect } from 'vitest';
import './setup.js';
import { calculateHaversineDistance } from '../src/utils/haversine.js';
import { GeofenceService } from '../src/services/geofenceService.js';

describe('Geofence & Haversine Distance Validation', () => {
  // S. B. Jain Nagpur Center: 21.2227, 79.0494
  const campusCenterLat = 21.2227;
  const campusCenterLon = 79.0494;

  it('should calculate accurate zero distance for identical coordinates', () => {
    const dist = calculateHaversineDistance(
      campusCenterLat,
      campusCenterLon,
      campusCenterLat,
      campusCenterLon
    );
    expect(dist).toBe(0);
  });

  it('should calculate distance within campus perimeter (< 100 meters)', () => {
    // 50m offset approximately
    const nearLat = 21.2230;
    const nearLon = 79.0496;
    const dist = calculateHaversineDistance(
      campusCenterLat,
      campusCenterLon,
      nearLat,
      nearLon
    );
    expect(dist).toBeLessThan(100);
  });

  it('should detect when student is within 200m radius', async () => {
    const result = await GeofenceService.isInsideCampus(campusCenterLat, campusCenterLon);
    expect(result.valid).toBe(true);
    expect(result.distanceMeters).toBeLessThanOrEqual(200);
  });

  it('should reject coordinates outside 200m radius (e.g. 5km away in Nagpur City)', async () => {
    const cityCenterLat = 21.1458;
    const cityCenterLon = 79.0882;
    const result = await GeofenceService.isInsideCampus(cityCenterLat, cityCenterLon);
    expect(result.valid).toBe(false);
    expect(result.distanceMeters).toBeGreaterThan(5000);
  });
});
