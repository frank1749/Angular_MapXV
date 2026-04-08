import { Feature, FeatureCollection, Point } from 'geojson';
import { AircraftState } from './aircraft.model';

export interface AircraftFeatureProperties {
  readonly icao24: string;
  readonly callsign: string;
  readonly originCountry: string;
  readonly velocity: number;
  readonly trueTrack: number;
  readonly baroAltitude: number;
  readonly geoAltitude: number;
  readonly verticalRate: number;
  readonly onGround: boolean;
  readonly squawk: string;
}

export type AircraftFeature = Feature<Point, AircraftFeatureProperties>;
export type AircraftFeatureCollection = FeatureCollection<Point, AircraftFeatureProperties>;
