import { Injectable, inject, signal, NgZone } from '@angular/core';
import { Map as MaplibreMap, GeoJSONSource, NavigationControl, LngLatBounds } from 'maplibre-gl';
import { FeatureCollection, Point } from 'geojson';
import { Subject, Observable } from 'rxjs';
import { MAP_CONFIG } from './map.tokens';

const AIRCRAFT_SOURCE_ID = 'aircraft-source';
const AIRCRAFT_LAYER_ID = 'aircraft-layer';
const CLUSTERS_LAYER_ID = 'clusters-layer';
const CLUSTER_COUNT_LAYER_ID = 'cluster-count-layer';

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

  private readonly _aircraftClick$ = new Subject<string | null>();

  readonly isReady = signal(false);
  readonly aircraftClick$: Observable<string | null> = this._aircraftClick$.asObservable();

  initialize(container: HTMLElement): void {
    if (this.map) {
      this.destroy();
    }

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
        this.setupClickHandlers();
        this.ngZone.run(() => this.isReady.set(true));
      });
    });
  }

  updateAircraftSource(geojson: FeatureCollection<Point>): void {
    if (!this.map || !this.sourceReady) return;

    const source = this.map.getSource(AIRCRAFT_SOURCE_ID) as GeoJSONSource | undefined;
    if (source) {
      this.ngZone.runOutsideAngular(() => source.setData(geojson));
    }
  }

  flyTo(longitude: number, latitude: number): void {
    if (!this.map) return;

    this.ngZone.runOutsideAngular(() => {
      this.map!.flyTo({
        center: [longitude, latitude],
        zoom: Math.max(this.map!.getZoom(), 7),
        speed: 1.5,
        curve: 1.2,
      });
    });
  }

  fitToFeatures(geojson: FeatureCollection<Point>): void {
    if (!this.map || geojson.features.length === 0) return;

    const bounds = new LngLatBounds();
    for (const feature of geojson.features) {
      bounds.extend(feature.geometry.coordinates as [number, number]);
    }

    this.ngZone.runOutsideAngular(() => {
      this.map!.fitBounds(bounds, { padding: 50, maxZoom: 8, duration: 1000 });
    });
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

    // Clustering is enabled directly on the GeoJSON source.
    // MapLibre handles grouping internally — no client-side spatial index needed.
    // clusterMaxZoom: stop clustering above zoom 14 so individual dots are always
    //   visible when the user is zoomed in close.
    // clusterRadius: 50px — controls how aggressively nearby points merge.
    //   Lower values = more clusters; higher values = fewer, larger clusters.
    this.map.addSource(AIRCRAFT_SOURCE_ID, {
      type: 'geojson',
      data: EMPTY_GEOJSON,
      generateId: true,
      cluster: true,
      clusterMaxZoom: 14,
      clusterRadius: 50,
    });

    // Layer 1 — cluster bubbles.
    // The ['has', 'point_count'] filter ensures only cluster features are styled here;
    // individual aircraft points are handled by AIRCRAFT_LAYER_ID below.
    // circle-color uses a 'step' expression to visually encode density:
    //   cyan (small) → yellow (medium) → pink (large).
    // circle-radius grows with density so large clusters are easy to spot.
    this.map.addLayer({
      id: CLUSTERS_LAYER_ID,
      type: 'circle',
      source: AIRCRAFT_SOURCE_ID,
      filter: ['has', 'point_count'],
      paint: {
        'circle-color': [
          'step', ['get', 'point_count'],
          '#51bbd6',   // < 100  — cyan
          100, '#f1f075', // 100–750 — yellow
          750, '#f28cb1', // 750+    — pink
        ],
        'circle-radius': [
          'step', ['get', 'point_count'],
          15,          // < 100
          100, 20,     // 100–750
          750, 25,     // 750+
        ],
        'circle-stroke-width': 2,
        'circle-stroke-color': '#ffffff',
      },
    });

    // Layer 2 — count label rendered on top of each cluster bubble.
    // 'point_count_abbreviated' is a MapLibre built-in that formats large numbers
    // as "1.2k", "3.4k", etc. so the label always fits inside the circle.
    // Must be added after CLUSTERS_LAYER_ID so it renders above it in the draw order.
    this.map.addLayer({
      id: CLUSTER_COUNT_LAYER_ID,
      type: 'symbol',
      source: AIRCRAFT_SOURCE_ID,
      filter: ['has', 'point_count'],
      layout: {
        'text-field': '{point_count_abbreviated}',
        'text-size': 12,
      },
      paint: {
        'text-color': '#333333',
      },
    });

    // Layer 3 — individual aircraft dots (unclustered points only).
    // The negated ['has', 'point_count'] filter is the counterpart of the cluster filter:
    // only features without a point_count property (i.e. real aircraft) pass through.
    // This layer must be last so aircraft dots render above the cluster bubbles.
    this.map.addLayer({
      id: AIRCRAFT_LAYER_ID,
      type: 'circle',
      source: AIRCRAFT_SOURCE_ID,
      filter: ['!', ['has', 'point_count']],
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

  private setupClickHandlers(): void {
    if (!this.map) return;

    // Click on individual aircraft
    this.map.on('click', AIRCRAFT_LAYER_ID, (e) => {
      const feature = e.features?.[0];
      const icao24 = feature?.properties?.['icao24'] as string | undefined;
      if (icao24) {
        this.ngZone.run(() => this._aircraftClick$.next(icao24));
      }
    });

    // Click on empty space to clear selection
    this.map.on('click', (e) => {
      if (!this.map) return;
      const features = this.map.queryRenderedFeatures(e.point, {
        layers: [AIRCRAFT_LAYER_ID, CLUSTERS_LAYER_ID]
      });
      if (features.length === 0) {
        this.ngZone.run(() => this._aircraftClick$.next(null));
      }
    });

    // Click on cluster → zoom in by +2 levels, centered on the cluster centroid.
    // easeTo() is used instead of flyTo() for a quicker, less dramatic transition —
    // the user is drilling into data, not navigating across the globe.
    // No ngZone.run() needed here: this interaction produces no Angular state change.
    this.map.on('click', CLUSTERS_LAYER_ID, (e) => {
      const feature = e.features?.[0];
      if (!feature || !this.map) return;

      const geometry = feature.geometry as GeoJSON.Point;
      this.map.easeTo({
        center: geometry.coordinates as [number, number],
        zoom: this.map.getZoom() + 2,
      });
    });

    this.map.on('mouseenter', AIRCRAFT_LAYER_ID, () => {
      if (this.map) this.map.getCanvas().style.cursor = 'pointer';
    });

    this.map.on('mouseleave', AIRCRAFT_LAYER_ID, () => {
      if (this.map) this.map.getCanvas().style.cursor = '';
    });

    // Mirror the pointer cursor behaviour from the aircraft layer so the user
    // gets the same affordance when hovering any clickable map feature.
    this.map.on('mouseenter', CLUSTERS_LAYER_ID, () => {
      if (this.map) this.map.getCanvas().style.cursor = 'pointer';
    });

    this.map.on('mouseleave', CLUSTERS_LAYER_ID, () => {
      if (this.map) this.map.getCanvas().style.cursor = '';
    });
  }
}
