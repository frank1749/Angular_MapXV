import {
  Component,
  ChangeDetectionStrategy,
  ElementRef,
  viewChild,
  AfterViewInit,
  OnDestroy,
  inject,
} from '@angular/core';
import { MapService } from '../../../shared/map/map.service';

@Component({
  selector: 'app-map-container',
  standalone: true,
  template: `<div #mapContainer class="map-container"></div>`,
  styles: [
    `
      :host {
        display: block;
        width: 100%;
        height: 100%;
      }
      .map-container {
        width: 100%;
        height: 100%;
      }
    `,
  ],
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class MapContainerComponent implements AfterViewInit, OnDestroy {
  private readonly mapService = inject(MapService);
  private readonly mapContainer = viewChild.required<ElementRef<HTMLElement>>('mapContainer');

  ngAfterViewInit(): void {
    this.mapService.initialize(this.mapContainer().nativeElement);
  }

  ngOnDestroy(): void {
    this.mapService.destroy();
  }
}
