import { Injectable, inject, DestroyRef } from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { tap, switchMap, filter, EMPTY } from 'rxjs';
import { AircraftRepository } from '../../data/aircraft/aircraft.repository';
import { AircraftStore } from '../../state/aircraft/aircraft.store';
import { PollingService } from '../../infrastructure/polling/polling.service';
import { VisibilityService } from '../../infrastructure/visibility/visibility.service';

const POLLING_INTERVAL_MS = 10_000;

@Injectable({ providedIn: 'root' })
export class AircraftFacade {
  private readonly repository = inject(AircraftRepository);
  private readonly store = inject(AircraftStore);
  private readonly polling = inject(PollingService);
  private readonly visibility = inject(VisibilityService);
  private readonly destroyRef = inject(DestroyRef);

  // --- Public read-only selectors (delegate to store) ---
  readonly aircraftMap = this.store.aircraftMap;
  readonly aircraftCount = this.store.aircraftCount;
  readonly aircraftGeoJson = this.store.aircraftGeoJson;
  readonly lastUpdated = this.store.lastUpdated;
  readonly loading = this.store.loading;
  readonly error = this.store.error;

  startPolling(): void {
    this.store.setLoading(true);

    this.visibility.visible$
      .pipe(
        switchMap((visible) => {
          if (!visible) {
            return EMPTY;
          }
          return this.polling.poll(() => this.repository.fetchAll(), {
            intervalMs: POLLING_INTERVAL_MS,
          });
        }),
        tap({
          next: (aircraft) => {
            this.store.setAircraft(aircraft);
            this.store.setLoading(false);
          },
          error: (err) => {
            this.store.setError('Failed to fetch aircraft data');
            this.store.setLoading(false);
          },
        }),
        takeUntilDestroyed(this.destroyRef),
      )
      .subscribe();
  }

  stopPolling(): void {
    this.polling.stopPolling();
  }
}
