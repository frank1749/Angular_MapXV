import { InjectionToken } from '@angular/core';

export interface MapConfig {
  readonly style: string;
  readonly center: [number, number];
  readonly zoom: number;
}

export const MAP_CONFIG = new InjectionToken<MapConfig>('MAP_CONFIG', {
  providedIn: 'root',
  factory: () => ({
    style: 'https://basemaps.cartocdn.com/gl/positron-gl-style/style.json',
    center: [0, 20] as [number, number],
    zoom: 2,
  }),
});
