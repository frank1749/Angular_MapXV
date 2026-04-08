import { AircraftState, PositionSource, RawAircraftStateArray } from '../../domain/aircraft/aircraft.model';

/**
 * Pure function: maps a raw OpenSky state array to a typed AircraftState.
 * Returns null if the aircraft has invalid/missing coordinates.
 */
export function adaptAircraftState(raw: RawAircraftStateArray): AircraftState | null {
  const longitude = raw[5];
  const latitude = raw[6];

  if (longitude === null || latitude === null) {
    return null;
  }

  return {
    icao24: raw[0],
    callsign: (raw[1] ?? '').trim() || 'N/A',
    originCountry: raw[2],
    timePosition: raw[3] ?? 0,
    lastContact: raw[4],
    longitude,
    latitude,
    baroAltitude: raw[7] ?? 0,
    onGround: raw[8],
    velocity: raw[9] ?? 0,
    trueTrack: raw[10] ?? 0,
    verticalRate: raw[11] ?? 0,
    geoAltitude: raw[13] ?? 0,
    squawk: raw[14] ?? 'N/A',
    spiFlag: raw[15],
    positionSource: raw[16] as PositionSource,
  };
}

/**
 * Pure function: maps an array of raw states to typed, valid AircraftState[].
 * Filters out all aircraft with missing coordinates.
 */
export function adaptAircraftStates(rawStates: RawAircraftStateArray[]): AircraftState[] {
  const result: AircraftState[] = [];
  for (const raw of rawStates) {
    const adapted = adaptAircraftState(raw);
    if (adapted !== null) {
      result.push(adapted);
    }
  }
  return result;
}
