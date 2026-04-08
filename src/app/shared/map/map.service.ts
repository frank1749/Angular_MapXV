import { Injectable, inject, signal, NgZone } from '@angular/core';
import { Map as MaplibreMap, GeoJSONSource, NavigationControl } from 'maplibre-gl';
import { FeatureCollection, Point } from 'geojson';
import { MAP_CONFIG } from './map.tokens';

const AIRCRAFT_SOURCE_ID = 'aircraft-source';
const AIRCRAFT_LAYER_ID = 'aircraft-layer';

const EMPTY_GEOJSON: FeatureCollection<Point> = {
  type: 'FeatureCollection',
  features: [],
};

@Injectable({ providedIn: 'root' })
export class MapService {
  private readonly config = inject(MAP_CONFIG);
  private readonly ngZone = inject(NgZone);

  private map: MaplibreMap | null = null;
  private sourceReady = false;

  readonly isReady = signal(false);

  initialize(container: HTMLElement): void {
    this.ngZone.runOutsideAngular(() => {
      this.map = new MaplibreMap({
        container,
        style: this.config.style,
        center: this.config.center,
        zoom: this.config.zoom,
      });

      this.map.addControl(new NavigationControl(), 'top-right');

      this.map.on('load', () => {
        this.setupAircraftLayer();
        this.ngZone.run(() => this.isReady.set(true));
      });
    });
  }

  updateAircraftSource(geojson: FeatureCollection<Point>): void {
    if (!this.map || !this.sourceReady) return;

    const source = this.map.getSource(AIRCRAFT_SOURCE_ID) as GeoJSONSource | undefined;
    if (source) {
      source.setData(geojson);
    }
  }

  destroy(): void {
    if (this.map) {
      this.map.remove();
      this.map = null;
      this.sourceReady = false;
      this.isReady.set(false);
    }
  }

  private setupAircraftLayer(): void {
    if (!this.map) return;

    this.map.addSource(AIRCRAFT_SOURCE_ID, {
      type: 'geojson',
      data: EMPTY_GEOJSON,
      generateId: true,
    });

    this.map.addLayer({
      id: AIRCRAFT_LAYER_ID,
      type: 'circle',
      source: AIRCRAFT_SOURCE_ID,
      paint: {
        'circle-radius': [
          'interpolate', ['linear'], ['zoom'],
          2, 2,
          5, 3,
          8, 5,
        ],
        'circle-color': [
          'case',
          ['get', 'onGround'], '#888888',
          '#1E88E5',
        ],
        'circle-stroke-width': 1,
        'circle-stroke-color': '#ffffff',
        'circle-opacity': 0.9,
      },
    });

    this.sourceReady = true;
  }
}
