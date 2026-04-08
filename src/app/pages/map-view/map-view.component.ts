import {
  Component,
  ChangeDetectionStrategy,
  inject,
  OnInit,
  OnDestroy,
  effect,
} from '@angular/core';
import { MapContainerComponent } from './map-container/map-container.component';
import { AircraftFacade } from '../../application/aircraft/aircraft.facade';
import { MapService } from '../../shared/map/map.service';

@Component({
  selector: 'app-map-view',
  standalone: true,
  imports: [MapContainerComponent],
  template: `
    <div class="map-view">
      <app-map-container />

      @if (facade.loading()) {
        <div class="status-overlay loading">Loading aircraft data...</div>
      }

      @if (facade.error(); as error) {
        <div class="status-overlay error">{{ error }}</div>
      }

      <div class="info-panel">
        <span>Aircraft: {{ facade.aircraftCount() }}</span>
        @if (facade.lastUpdated(); as ts) {
          <span>Updated: {{ formatTimestamp(ts) }}</span>
        }
      </div>
    </div>
  `,
  styles: [
    `
      :host {
        display: block;
        width: 100%;
        height: 100%;
      }
      .map-view {
        position: relative;
        width: 100%;
        height: 100%;
      }
      .status-overlay {
        position: absolute;
        top: 12px;
        left: 50%;
        transform: translateX(-50%);
        padding: 8px 16px;
        border-radius: 4px;
        font-size: 14px;
        z-index: 10;
        pointer-events: none;
      }
      .loading {
        background: rgba(33, 150, 243, 0.9);
        color: white;
      }
      .error {
        background: rgba(244, 67, 54, 0.9);
        color: white;
      }
      .info-panel {
        position: absolute;
        bottom: 12px;
        left: 12px;
        display: flex;
        gap: 16px;
        padding: 8px 12px;
        background: rgba(255, 255, 255, 0.9);
        border-radius: 4px;
        font-size: 13px;
        z-index: 10;
      }
    `,
  ],
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class MapViewComponent implements OnInit, OnDestroy {
  readonly facade = inject(AircraftFacade);
  private readonly mapService = inject(MapService);

  constructor() {
    // Effect: push GeoJSON to MapLibre whenever data or map readiness changes
    effect(() => {
      const isReady = this.mapService.isReady();
      const geojson = this.facade.aircraftGeoJson();

      if (isReady) {
        this.mapService.updateAircraftSource(geojson);
      }
    });
  }

  ngOnInit(): void {
    this.facade.startPolling();
  }

  ngOnDestroy(): void {
    this.facade.stopPolling();
  }

  formatTimestamp(ts: number): string {
    return new Date(ts).toLocaleTimeString();
  }
}
