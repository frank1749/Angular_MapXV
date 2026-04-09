import { Injectable, computed, signal } from '@angular/core';
import { AircraftState } from '../../domain/aircraft/aircraft.model';
import { AircraftFeatureCollection } from '../../domain/aircraft/aircraft-geojson.model';
import { aircraftMapToGeoJson } from '../../data/aircraft/aircraft-geojson.mapper';

@Injectable({ providedIn: 'root' })
export class AircraftStore {
  // --- Private writable state ---
  private readonly _aircraftMap = signal<Record<string, AircraftState>>({});
  private readonly _lastUpdated = signal<number | null>(null);
  private readonly _loading = signal(false);
  private readonly _error = signal<string | null>(null);
  private readonly _selectedIcao24 = signal<string | null>(null);
  // Bonus: country filter — null means "show all", a non-null value narrows the visible set
  private readonly _filterCountry = signal<string | null>(null);

  // --- Public read-only selectors ---
  readonly aircraftMap = this._aircraftMap.asReadonly();
  readonly lastUpdated = this._lastUpdated.asReadonly();
  readonly loading = this._loading.asReadonly();
  readonly error = this._error.asReadonly();
  readonly selectedIcao24 = this._selectedIcao24.asReadonly();
  readonly filterCountry = this._filterCountry.asReadonly();

  // Derives the sorted list of unique origin countries from the FULL (unfiltered) map.
  // Keeps the dropdown populated even when a filter is already active.
  readonly availableCountries = computed<string[]>(() => {
    const countries = new Set<string>();
    for (const aircraft of Object.values(this._aircraftMap())) {
      countries.add(aircraft.originCountry);
    }
    return Array.from(countries).sort();
  });

  // Private computed that applies the country filter to the full aircraft map.
  // Consumed by aircraftCount and aircraftGeoJson so both always reflect the active filter.
  // Kept private because external code should never bypass the filter intentionally.
  private readonly filteredAircraftMap = computed<Record<string, AircraftState>>(() => {
    const country = this._filterCountry();
    const map = this._aircraftMap();
    // Short-circuit: no filter active → return the full map without iterating
    if (!country) return map;

    const filtered: Record<string, AircraftState> = {};
    for (const [icao, aircraft] of Object.entries(map)) {
      if (aircraft.originCountry === country) {
        filtered[icao] = aircraft;
      }
    }
    return filtered;
  });

  readonly aircraftCount = computed(() => Object.keys(this.filteredAircraftMap()).length);

  readonly aircraftGeoJson = computed<AircraftFeatureCollection>(() =>
    aircraftMapToGeoJson(this.filteredAircraftMap()),
  );

  // Intentionally reads from the UNFILTERED map so that a selected aircraft
  // remains resolved in the detail panel even if it falls outside the active filter.
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

  // Passing null is equivalent to clearFilter() — explicit null support
  // keeps the mat-select binding simple (no need for a sentinel value).
  setCountryFilter(country: string | null): void {
    this._filterCountry.set(country);
  }

  // Explicit clear method for clarity at call sites (e.g., a "Clear" button).
  clearFilter(): void {
    this._filterCountry.set(null);
  }

  reset(): void {
    this._aircraftMap.set({});
    this._lastUpdated.set(null);
    this._loading.set(false);
    this._error.set(null);
    this._selectedIcao24.set(null);
    this._filterCountry.set(null); // reset clears the filter so the map shows all aircraft
  }
}
