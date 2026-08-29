import { CampusConfig } from '../models/CampusConfig.js';
import { calculateHaversineDistance } from '../utils/haversine.js';
import { env } from '../config/env.js';
import { logger } from '../utils/logger.js';

export interface GeofenceResult {
  valid: boolean;
  distanceMeters: number;
  campusName: string;
  allowedRadiusMeters: number;
}

export class GeofenceService {
  /**
   * Validates whether given coordinates fall within authorized campus radius.
   *
   * @param latitude Student/terminal latitude
   * @param longitude Student/terminal longitude
   * @returns GeofenceResult
   */
  public static async isInsideCampus(
    latitude: number,
    longitude: number
  ): Promise<GeofenceResult> {
    let campus = await CampusConfig.findOne({ isActive: true });

    const campusLat = campus ? campus.latitude : env.CAMPUS_LATITUDE;
    const campusLon = campus ? campus.longitude : env.CAMPUS_LONGITUDE;
    const radiusMeters = campus ? campus.radiusMeters : env.CAMPUS_RADIUS_METERS;
    const campusName = campus
      ? campus.campusName
      : 'S. B. Jain Institute of Technology, Nagpur';

    const distanceMeters = calculateHaversineDistance(
      latitude,
      longitude,
      campusLat,
      campusLon
    );

    const valid = distanceMeters <= radiusMeters;

    logger.debug(
      `Geofence Check: coords=(${latitude}, ${longitude}) vs campus=(${campusLat}, ${campusLon}) -> dist=${distanceMeters.toFixed(
        1
      )}m, radius=${radiusMeters}m, valid=${valid}`
    );

    return {
      valid,
      distanceMeters: Math.round(distanceMeters * 10) / 10,
      campusName,
      allowedRadiusMeters: radiusMeters,
    };
  }
}
