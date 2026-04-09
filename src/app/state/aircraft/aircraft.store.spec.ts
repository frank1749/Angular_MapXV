import { AircraftStore } from './aircraft.store';
import { AircraftState, PositionSource } from '../../domain/aircraft/aircraft.model';

function createAircraft(icao: string): AircraftState {
  return {
    icao24: icao,
    callsign: 'CALL',
    originCountry: 'Country',
    timePosition: 1609459200,
    lastContact: 1609459200,
    longitude: 8.57,
    latitude: 50.03,
    baroAltitude: 10000,
    onGround: false,
    velocity: 250,
    trueTrack: 180,
    verticalRate: 0,
    geoAltitude: 11000,
    squawk: '1000',
    spiFlag: false,
    positionSource: PositionSource.ADS_B,
  };
}

describe('AircraftStore', () => {
  let store: AircraftStore;

  beforeEach(() => {
    store = new AircraftStore();
  });

  it('should start with empty state', () => {
    expect(store.aircraftCount()).toBe(0);
    expect(store.lastUpdated()).toBeNull();
    expect(store.loading()).toBe(false);
    expect(store.error()).toBeNull();
  });

  it('should normalize aircraft array into a record', () => {
    const aircraft = [createAircraft('abc'), createAircraft('def')];
    store.setAircraft(aircraft);

    const map = store.aircraftMap();
    expect(Object.keys(map).length).toBe(2);
    expect(map['abc'].icao24).toBe('abc');
    expect(map['def'].icao24).toBe('def');
  });

  it('should update aircraftCount computed signal', () => {
    store.setAircraft([createAircraft('a'), createAircraft('b'), createAircraft('c')]);
    expect(store.aircraftCount()).toBe(3);
  });

  it('should update lastUpdated on setAircraft', () => {
    store.setAircraft([createAircraft('a')]);
    expect(store.lastUpdated()).not.toBeNull();
    expect(store.lastUpdated()).toBeGreaterThan(0);
  });

  it('should clear error on successful setAircraft', () => {
    store.setError('Something failed');
    expect(store.error()).toBe('Something failed');

    store.setAircraft([createAircraft('a')]);
    expect(store.error()).toBeNull();
  });

  it('should produce valid GeoJSON from aircraftGeoJson', () => {
    store.setAircraft([createAircraft('abc')]);
    const geojson = store.aircraftGeoJson();

    expect(geojson.type).toBe('FeatureCollection');
    expect(geojson.features.length).toBe(1);
    expect(geojson.features[0].properties.icao24).toBe('abc');
    expect(geojson.features[0].geometry.coordinates).toEqual([8.57, 50.03]);
  });

  it('should return empty FeatureCollection when no aircraft', () => {
    const geojson = store.aircraftGeoJson();
    expect(geojson.features).toEqual([]);
  });

  it('should replace all aircraft on subsequent setAircraft calls', () => {
    store.setAircraft([createAircraft('a'), createAircraft('b')]);
    expect(store.aircraftCount()).toBe(2);

    store.setAircraft([createAircraft('c')]);
    expect(store.aircraftCount()).toBe(1);
    expect(store.aircraftMap()['a']).toBeUndefined();
    expect(store.aircraftMap()['c']).toBeTruthy();
  });

  it('should set and read loading state', () => {
    store.setLoading(true);
    expect(store.loading()).toBe(true);

    store.setLoading(false);
    expect(store.loading()).toBe(false);
  });

  it('should set and read error state', () => {
    store.setError('Network failure');
    expect(store.error()).toBe('Network failure');

    store.setError(null);
    expect(store.error()).toBeNull();
  });

  it('should reset all state', () => {
    store.setAircraft([createAircraft('a')]);
    store.setLoading(true);
    store.setError('err');

    store.reset();

    expect(store.aircraftCount()).toBe(0);
    expect(store.lastUpdated()).toBeNull();
    expect(store.loading()).toBe(false);
    expect(store.error()).toBeNull();
  });

  it('should deduplicate aircraft by icao24', () => {
    const a1 = createAircraft('dup');
    const a2 = { ...createAircraft('dup'), velocity: 999 };

    store.setAircraft([a1, a2]);
    expect(store.aircraftCount()).toBe(1);
    expect(store.aircraftMap()['dup'].velocity).toBe(999);
  });

  // --- Country filter ---
  describe('country filter', () => {
    const germany = { ...createAircraft('de1'), originCountry: 'Germany' };
    const germany2 = { ...createAircraft('de2'), originCountry: 'Germany' };
    const france = { ...createAircraft('fr1'), originCountry: 'France' };
    const usa = { ...createAircraft('us1'), originCountry: 'United States' };

    beforeEach(() => {
      store.setAircraft([germany, germany2, france, usa]);
    });

    it('should start with no country filter', () => {
      expect(store.filterCountry()).toBeNull();
    });

    it('should compute available countries sorted alphabetically', () => {
      expect(store.availableCountries()).toEqual(['France', 'Germany', 'United States']);
    });

    it('should return all aircraft when no filter is set', () => {
      expect(store.aircraftCount()).toBe(4);
      expect(store.aircraftGeoJson().features.length).toBe(4);
    });

    it('should filter aircraft by country', () => {
      store.setCountryFilter('Germany');
      expect(store.aircraftCount()).toBe(2);
      expect(store.aircraftGeoJson().features.length).toBe(2);
      expect(store.aircraftGeoJson().features.every(f => f.properties.originCountry === 'Germany')).toBe(true);
    });

    it('should return zero aircraft when filtering non-existent country', () => {
      store.setCountryFilter('Atlantis');
      expect(store.aircraftCount()).toBe(0);
      expect(store.aircraftGeoJson().features.length).toBe(0);
    });

    it('should clear filter and show all aircraft', () => {
      store.setCountryFilter('France');
      expect(store.aircraftCount()).toBe(1);

      store.clearFilter();
      expect(store.filterCountry()).toBeNull();
      expect(store.aircraftCount()).toBe(4);
    });

    it('should still resolve selectedAircraft from unfiltered map', () => {
      store.setCountryFilter('Germany');
      store.selectAircraft('fr1');
      expect(store.selectedAircraft()).toBeTruthy();
      expect(store.selectedAircraft()!.icao24).toBe('fr1');
    });

    it('should reset filter on reset()', () => {
      store.setCountryFilter('Germany');
      store.reset();
      expect(store.filterCountry()).toBeNull();
    });

    it('should update availableCountries when aircraft data changes', () => {
      store.setAircraft([france]);
      expect(store.availableCountries()).toEqual(['France']);
    });
  });
});
