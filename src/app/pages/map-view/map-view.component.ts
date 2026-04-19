import {
  Component,
  ChangeDetectionStrategy,
  inject,
  OnInit,
  OnDestroy,
  effect,
  DestroyRef,
} from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatSelectModule } from '@angular/material/select';
import { MatSnackBarModule, MatSnackBar } from '@angular/material/snack-bar';
import { MapContainerComponent } from './map-container/map-container.component';
import { AircraftFacade } from '../../application/aircraft/aircraft.facade';
import { MapService } from '../../shared/map/map.service';

@Component({
  selector: 'app-map-view',
  standalone: true,
  imports: [MapContainerComponent, MatFormFieldModule, MatSelectModule, MatSnackBarModule],
  templateUrl: './map-view.component.html',
  styleUrl: './map-view.component.css',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class MapViewComponent implements OnInit, OnDestroy {
  readonly facade = inject(AircraftFacade);
  private readonly mapService = inject(MapService);
  private readonly destroyRef = inject(DestroyRef);
  private readonly snackBar = inject(MatSnackBar);

  constructor() {
    // Effect: push GeoJSON to MapLibre whenever data or map readiness changes
    effect(() => {
      const isReady = this.mapService.isReady();
      const geojson = this.facade.aircraftGeoJson();

      if (!isReady || !geojson.features.length) return;

      this.mapService.updateAircraftSource(geojson);
    });

    // Stream: bridge map click event → facade selection
    this.mapService.aircraftClick$
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe((icao24) => this.facade.selectAircraft(icao24));

    // Effect: fly to selected aircraft (only on selection change, not on poll updates)
    let lastCenteredIcao: string | null = null;

    effect(() => {
      const icao24 = this.facade.selectedIcao24();
      const aircraft = this.facade.selectedAircraft();

      if (!aircraft || icao24 === lastCenteredIcao) return;

      lastCenteredIcao = icao24;
      this.mapService.flyTo(aircraft.longitude, aircraft.latitude);
    });
  }

  ngOnInit(): void {
    this.facade.startPolling();
  }

  ngOnDestroy(): void {
    this.facade.stopPolling();
  }

  closePanel(): void {
    this.facade.selectAircraft(null);
  }

  onFilterChange(country: string | null): void {
    this.facade.setCountryFilter(country);
    
    const geojson = this.facade.aircraftGeoJson();
    const count = this.facade.aircraftCount();

    if (country) {
      this.snackBar.open(`Filtered by ${country}: ${count} aircraft found`, 'Close', { duration: 3000 });
      if (geojson.features.length > 0) {
        this.mapService.fitToFeatures(geojson);
      }
    } else {
      this.snackBar.open('Filter cleared. Showing all aircraft', 'Close', { duration: 3000 });
    }
  }

  formatTimestamp(ts: number): string {
    return new Date(ts).toLocaleTimeString();
  }
}
