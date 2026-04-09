import { AircraftState, PositionSource } from '../../domain/aircraft/aircraft.model';
import { aircraftToFeature, aircraftMapToGeoJson } from './aircraft-geojson.mapper';

function createAircraft(overrides: Partial<AircraftState> = {}): AircraftState {
  return {
    icao24: 'abc123',
    callsign: 'DLH1234',
    originCountry: 'Germany',
    timePosition: 1609459200,
    lastContact: 1609459200,
    longitude: 8.5706,
    latitude: 50.0333,
    baroAltitude: 10972.8,
    onGround: false,
    velocity: 250.0,
    trueTrack: 180.0,
    verticalRate: 0.0,
    geoAltitude: 11277.6,
    squawk: '1000',
    spiFlag: false,
    positionSource: PositionSource.ADS_B,
    ...overrides,
  };
}

describe('AircraftGeoJsonMapper', () => {
  describe('aircraftToFeature', () => {
    it('should map AircraftState to GeoJSON Feature', () => {
      const aircraft = createAircraft();
      const feature = aircraftToFeature(aircraft);

      expect(feature.type).toBe('Feature');
      expect(feature.geometry.type).toBe('Point');
      expect(feature.geometry.coordinates).toEqual([8.5706, 50.0333]);
      expect(feature.properties.icao24).toBe('abc123');
      expect(feature.properties.callsign).toBe('DLH1234');
      expect(feature.properties.velocity).toBe(250.0);
      expect(feature.properties.trueTrack).toBe(180.0);
      expect(feature.properties.onGround).toBe(false);
    });

    it('should map coordinates in [longitude, latitude] order', () => {
      const aircraft = createAircraft({ longitude: -73.9857, latitude: 40.7484 });
      const feature = aircraftToFeature(aircraft);

      expect(feature.geometry.coordinates[0]).toBe(-73.9857);
      expect(feature.geometry.coordinates[1]).toBe(40.7484);
    });
  });

  describe('aircraftMapToGeoJson', () => {
    it('should convert normalized map to FeatureCollection', () => {
      const map: Record<string, AircraftState> = {
        abc123: createAircraft({ icao24: 'abc123' }),
        def456: createAircraft({ icao24: 'def456', longitude: 9.0, latitude: 48.5 }),
      };

      const collection = aircraftMapToGeoJson(map);

      expect(collection.type).toBe('FeatureCollection');
      expect(collection.features.length).toBe(2);
    });

    it('should return empty FeatureCollection for empty map', () => {
      const collection = aircraftMapToGeoJson({});

      expect(collection.type).toBe('FeatureCollection');
      expect(collection.features).toEqual([]);
    });
  });
});
