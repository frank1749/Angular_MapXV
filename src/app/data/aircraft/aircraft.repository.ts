import { Injectable, inject } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable, map, catchError, of } from 'rxjs';
import { AircraftState, OpenSkyApiResponse } from '../../domain/aircraft/aircraft.model';
import { adaptAircraftStates } from './aircraft.adapter';

const OPENSKY_API_URL = '/api/states/all';

@Injectable({ providedIn: 'root' })
export class AircraftRepository {
  private readonly http = inject(HttpClient);

  fetchAll(): Observable<AircraftState[]> {
    return this.http.get<OpenSkyApiResponse>(OPENSKY_API_URL).pipe(
      map((response) => adaptAircraftStates(response.states ?? [])),
      catchError(() => of([])),
    );
  }
}
