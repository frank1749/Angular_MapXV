import { RawAircraftStateArray } from '../../domain/aircraft/aircraft.model';
import { adaptAircraftState, adaptAircraftStates } from './aircraft.adapter';

function createRawState(overrides: Partial<Record<number, unknown>> = {}): RawAircraftStateArray {
  const base: RawAircraftStateArray = [
    'abc123',          // 0: icao24
    'DLH1234 ',       // 1: callsign (with trailing space)
    'Germany',         // 2: origin_country
    1609459200,        // 3: time_position
    1609459200,        // 4: last_contact
    8.5706,            // 5: longitude
    50.0333,           // 6: latitude
    10972.8,           // 7: baro_altitude
    false,             // 8: on_ground
    250.0,             // 9: velocity
    180.0,             // 10: true_track
    0.0,               // 11: vertical_rate
    null,              // 12: sensors
    11277.6,           // 13: geo_altitude
    '1000',            // 14: squawk
    false,             // 15: spi
    0,                 // 16: position_source
  ];

  for (const [index, value] of Object.entries(overrides)) {
    (base as unknown[])[Number(index)] = value;
  }

  return base;
}

describe('AircraftAdapter', () => {
  describe('adaptAircraftState', () => {
    it('should map a complete raw array to AircraftState', () => {
      const raw = createRawState();
      const result = adaptAircraftState(raw);

      expect(result).toBeTruthy();
      expect(result!.icao24).toBe('abc123');
      expect(result!.callsign).toBe('DLH1234');
      expect(result!.originCountry).toBe('Germany');
      expect(result!.longitude).toBe(8.5706);
      expect(result!.latitude).toBe(50.0333);
      expect(result!.baroAltitude).toBe(10972.8);
      expect(result!.onGround).toBe(false);
      expect(result!.velocity).toBe(250.0);
      expect(result!.trueTrack).toBe(180.0);
      expect(result!.verticalRate).toBe(0.0);
      expect(result!.geoAltitude).toBe(11277.6);
      expect(result!.squawk).toBe('1000');
      expect(result!.spiFlag).toBe(false);
      expect(result!.positionSource).toBe(0);
    });

    it('should return null when longitude is null', () => {
      const raw = createRawState({ 5: null });
      expect(adaptAircraftState(raw)).toBeNull();
    });

    it('should return null when latitude is null', () => {
      const raw = createRawState({ 6: null });
      expect(adaptAircraftState(raw)).toBeNull();
    });

    it('should return null when both coordinates are null', () => {
      const raw = createRawState({ 5: null, 6: null });
      expect(adaptAircraftState(raw)).toBeNull();
    });

    it('should default callsign to N/A when null', () => {
      const raw = createRawState({ 1: null });
      const result = adaptAircraftState(raw);
      expect(result!.callsign).toBe('N/A');
    });

    it('should default callsign to N/A when empty string', () => {
      const raw = createRawState({ 1: '   ' });
      const result = adaptAircraftState(raw);
      expect(result!.callsign).toBe('N/A');
    });

    it('should trim callsign whitespace', () => {
      const raw = createRawState({ 1: '  UAL456  ' });
      const result = adaptAircraftState(raw);
      expect(result!.callsign).toBe('UAL456');
    });

    it('should default baro_altitude to 0 when null', () => {
      const raw = createRawState({ 7: null });
      const result = adaptAircraftState(raw);
      expect(result!.baroAltitude).toBe(0);
    });

    it('should default velocity to 0 when null', () => {
      const raw = createRawState({ 9: null });
      const result = adaptAircraftState(raw);
      expect(result!.velocity).toBe(0);
    });

    it('should default trueTrack to 0 when null', () => {
      const raw = createRawState({ 10: null });
      const result = adaptAircraftState(raw);
      expect(result!.trueTrack).toBe(0);
    });

    it('should default verticalRate to 0 when null', () => {
      const raw = createRawState({ 11: null });
      const result = adaptAircraftState(raw);
      expect(result!.verticalRate).toBe(0);
    });

    it('should default geoAltitude to 0 when null', () => {
      const raw = createRawState({ 13: null });
      const result = adaptAircraftState(raw);
      expect(result!.geoAltitude).toBe(0);
    });

    it('should default squawk to N/A when null', () => {
      const raw = createRawState({ 14: null });
      const result = adaptAircraftState(raw);
      expect(result!.squawk).toBe('N/A');
    });

    it('should default timePosition to 0 when null', () => {
      const raw = createRawState({ 3: null });
      const result = adaptAircraftState(raw);
      expect(result!.timePosition).toBe(0);
    });
  });

  describe('adaptAircraftStates', () => {
    it('should map and filter an array of raw states', () => {
      const rawStates: RawAircraftStateArray[] = [
        createRawState(),                         // valid
        createRawState({ 0: 'def456', 5: null }), // invalid (no lon)
        createRawState({ 0: 'ghi789' }),           // valid
      ];

      const result = adaptAircraftStates(rawStates);

      expect(result.length).toBe(2);
      expect(result[0].icao24).toBe('abc123');
      expect(result[1].icao24).toBe('ghi789');
    });

    it('should return empty array when all states are invalid', () => {
      const rawStates: RawAircraftStateArray[] = [
        createRawState({ 5: null }),
        createRawState({ 6: null }),
      ];

      expect(adaptAircraftStates(rawStates)).toEqual([]);
    });

    it('should return empty array for empty input', () => {
      expect(adaptAircraftStates([])).toEqual([]);
    });
  });
});
