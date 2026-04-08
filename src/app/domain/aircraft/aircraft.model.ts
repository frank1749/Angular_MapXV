/**
 * Domain model representing a single aircraft state from the OpenSky Network.
 * All null-safety is handled at the adapter level — this model guarantees valid data.
 */
export interface AircraftState {
  readonly icao24: string;
  readonly callsign: string;
  readonly originCountry: string;
  readonly timePosition: number;
  readonly lastContact: number;
  readonly longitude: number;
  readonly latitude: number;
  readonly baroAltitude: number;
  readonly onGround: boolean;
  readonly velocity: number;
  readonly trueTrack: number;
  readonly verticalRate: number;
  readonly geoAltitude: number;
  readonly squawk: string;
  readonly spiFlag: boolean;
  readonly positionSource: PositionSource;
}

export enum PositionSource {
  ADS_B = 0,
  ASTERIX = 1,
  MLAT = 2,
  FLARM = 3,
}

/**
 * Raw API response shape from OpenSky Network /states/all endpoint.
 */
export interface OpenSkyApiResponse {
  readonly time: number;
  readonly states: RawAircraftStateArray[] | null;
}

/**
 * Each aircraft state comes as a positional array from the API.
 * Index positions:
 *  0: icao24        6: baro_altitude   12: geo_altitude
 *  1: callsign      7: on_ground       13: squawk
 *  2: origin_country 8: velocity        14: spi
 *  3: time_position  9: true_track      15: position_source
 *  4: last_contact  10: vertical_rate
 *  5: longitude     11: sensors
 */
export type RawAircraftStateArray = [
  string,             // 0: icao24
  string | null,      // 1: callsign
  string,             // 2: origin_country
  number | null,      // 3: time_position
  number,             // 4: last_contact
  number | null,      // 5: longitude
  number | null,      // 6: latitude
  number | null,      // 7: baro_altitude
  boolean,            // 8: on_ground
  number | null,      // 9: velocity
  number | null,      // 10: true_track
  number | null,      // 11: vertical_rate
  number[] | null,    // 12: sensors
  number | null,      // 13: geo_altitude
  string | null,      // 14: squawk
  boolean,            // 15: spi
  number,             // 16: position_source
];
