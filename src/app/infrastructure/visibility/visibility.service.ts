import { Injectable, NgZone, inject } from '@angular/core';
import { Observable, distinctUntilChanged, shareReplay } from 'rxjs';

@Injectable({ providedIn: 'root' })
export class VisibilityService {
  private readonly ngZone = inject(NgZone);

  /**
   * Emits true when the page is visible, false when hidden.
   * Runs outside Angular zone to avoid unnecessary change detection.
   */
  readonly visible$: Observable<boolean> = new Observable<boolean>((subscriber) => {
    const handler = (): void => {
      subscriber.next(!document.hidden);
    };

    this.ngZone.runOutsideAngular(() => {
      document.addEventListener('visibilitychange', handler);
    });

    // Emit initial state
    subscriber.next(!document.hidden);

    return () => {
      document.removeEventListener('visibilitychange', handler);
    };
  }).pipe(
    distinctUntilChanged(),
    shareReplay({ bufferSize: 1, refCount: true }),
  );

}
