import { TestBed } from '@angular/core/testing';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { provideHttpClient } from '@angular/common/http';
import { AircraftRepository } from './aircraft.repository';
import { OpenSkyApiResponse, RawAircraftStateArray } from '../../domain/aircraft/aircraft.model';

function createRawState(icao: string, lon: number | null, lat: number | null): RawAircraftStateArray {
  return [
    icao, 'CALL', 'Country', 1609459200, 1609459200,
    lon, lat, 10000, false, 250, 180, 0, null, 11000, '1000', false, 0,
  ];
}

describe('AircraftRepository', () => {
  let repository: AircraftRepository;
  let httpMock: HttpTestingController;

  beforeEach(() => {
    TestBed.configureTestingModule({
      providers: [
        provideHttpClient(),
        provideHttpClientTesting(),
        AircraftRepository,
      ],
    });

    repository = TestBed.inject(AircraftRepository);
    httpMock = TestBed.inject(HttpTestingController);
  });

  afterEach(() => {
    httpMock.verify();
  });

  it('should fetch and adapt aircraft states', () => {
    const mockResponse: OpenSkyApiResponse = {
      time: 1609459200,
      states: [
        createRawState('abc123', 8.57, 50.03),
        createRawState('def456', 9.0, 48.5),
      ],
    };

    repository.fetchAll().subscribe((result) => {
      expect(result.length).toBe(2);
      expect(result[0].icao24).toBe('abc123');
      expect(result[1].icao24).toBe('def456');
    });

    const req = httpMock.expectOne('/api/states/all');
    expect(req.request.method).toBe('GET');
    req.flush(mockResponse);
  });

  it('should filter out aircraft with null coordinates', () => {
    const mockResponse: OpenSkyApiResponse = {
      time: 1609459200,
      states: [
        createRawState('abc123', 8.57, 50.03),
        createRawState('no-lon', null, 50.03),
        createRawState('no-lat', 8.57, null),
      ],
    };

    repository.fetchAll().subscribe((result) => {
      expect(result.length).toBe(1);
      expect(result[0].icao24).toBe('abc123');
    });

    const req = httpMock.expectOne('/api/states/all');
    req.flush(mockResponse);
  });

  it('should handle null states in response', () => {
    const mockResponse: OpenSkyApiResponse = {
      time: 1609459200,
      states: null,
    };

    repository.fetchAll().subscribe((result) => {
      expect(result).toEqual([]);
    });

    const req = httpMock.expectOne('/api/states/all');
    req.flush(mockResponse);
  });

  it('should return empty array on HTTP error', () => {
    repository.fetchAll().subscribe((result) => {
      expect(result).toEqual([]);
    });

    const req = httpMock.expectOne('/api/states/all');
    req.flush('Server Error', { status: 500, statusText: 'Internal Server Error' });
  });

  it('should return empty array on network error', () => {
    repository.fetchAll().subscribe((result) => {
      expect(result).toEqual([]);
    });

    const req = httpMock.expectOne('/api/states/all');
    req.error(new ProgressEvent('error'));
  });
});
