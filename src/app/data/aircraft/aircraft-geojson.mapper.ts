import { AircraftState } from '../../domain/aircraft/aircraft.model';
import { AircraftFeature, AircraftFeatureCollection } from '../../domain/aircraft/aircraft-geojson.model';

/**
 * Pure function: converts a single AircraftState to a GeoJSON Feature.
 */
export function aircraftToFeature(aircraft: AircraftState): AircraftFeature {
  return {
    type: 'Feature',
    geometry: {
      type: 'Point',
      coordinates: [aircraft.longitude, aircraft.latitude],
    },
    properties: {
      icao24: aircraft.icao24,
      callsign: aircraft.callsign,
      originCountry: aircraft.originCountry,
      velocity: aircraft.velocity,
      trueTrack: aircraft.trueTrack,
      baroAltitude: aircraft.baroAltitude,
      geoAltitude: aircraft.geoAltitude,
      verticalRate: aircraft.verticalRate,
      onGround: aircraft.onGround,
      squawk: aircraft.squawk,
    },
  };
}

/**
 * Pure function: converts a normalized aircraft state map to a GeoJSON FeatureCollection.
 */
export function aircraftMapToGeoJson(
  aircraftMap: Record<string, AircraftState>,
): AircraftFeatureCollection {
  const features: AircraftFeature[] = [];
  for (const aircraft of Object.values(aircraftMap)) {
    features.push(aircraftToFeature(aircraft));
  }
  return {
    type: 'FeatureCollection',
    features,
  };
}
