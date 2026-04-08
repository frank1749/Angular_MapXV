import { Injectable, computed, signal } from '@angular/core';
import { AircraftState } from '../../domain/aircraft/aircraft.model';
import { AircraftFeatureCollection } from '../../domain/aircraft/aircraft-geojson.model';
import { aircraftMapToGeoJson } from '../../data/aircraft/aircraft-geojson.mapper';

export interface AircraftStoreState {
  readonly aircraftMap: Record<string, AircraftState>;
  readonly lastUpdated: number | null;
  readonly loading: boolean;
  readonly error: string | null;
}

const INITIAL_STATE: AircraftStoreState = {
  aircraftMap: {},
  lastUpdated: null,
  loading: false,
  error: null,
};

@Injectable({ providedIn: 'root' })
export class AircraftStore {
  // --- Private writable state ---
  private readonly _aircraftMap = signal<Record<string, AircraftState>>({});
  private readonly _lastUpdated = signal<number | null>(null);
  private readonly _loading = signal(false);
  private readonly _error = signal<string | null>(null);
  private readonly _selectedIcao24 = signal<string | null>(null);

  // --- Public read-only selectors ---
  readonly aircraftMap = this._aircraftMap.asReadonly();
  readonly lastUpdated = this._lastUpdated.asReadonly();
  readonly loading = this._loading.asReadonly();
  readonly error = this._error.asReadonly();
  readonly selectedIcao24 = this._selectedIcao24.asReadonly();

  readonly aircraftCount = computed(() => Object.keys(this._aircraftMap()).length);

  readonly aircraftGeoJson = computed<AircraftFeatureCollection>(() =>
    aircraftMapToGeoJson(this._aircraftMap()),
  );

  readonly selectedAircraft = computed<AircraftState | null>(() => {
    const icao = this._selectedIcao24();
    if (!icao) return null;
    return this._aircraftMap()[icao] ?? null;
  });

  // --- Mutations ---
  setAircraft(aircraftList: AircraftState[]): void {
    const normalized: Record<string, AircraftState> = {};
    for (const aircraft of aircraftList) {
      normalized[aircraft.icao24] = aircraft;
    }
    this._aircraftMap.set(normalized);
    this._lastUpdated.set(Date.now());
    this._error.set(null);
  }

  setLoading(loading: boolean): void {
    this._loading.set(loading);
  }

  setError(error: string | null): void {
    this._error.set(error);
  }

  selectAircraft(icao24: string | null): void {
    this._selectedIcao24.set(icao24);
  }

  reset(): void {
    this._aircraftMap.set({});
    this._lastUpdated.set(null);
    this._loading.set(false);
    this._error.set(null);
    this._selectedIcao24.set(null);
  }
}
