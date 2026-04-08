import { Injectable } from '@angular/core';
import { Observable, switchMap, timer, Subject, share, retry, takeUntil } from 'rxjs';

export interface PollingConfig {
  readonly intervalMs: number;
  readonly retryAttempts: number;
  readonly retryDelayMs: number;
}

const DEFAULT_CONFIG: PollingConfig = {
  intervalMs: 10_000,
  retryAttempts: 3,
  retryDelayMs: 5_000,
};

@Injectable({ providedIn: 'root' })
export class PollingService {
  private readonly stop$ = new Subject<void>();

  /**
   * Creates a polling stream that emits at a regular interval.
   * Uses switchMap to cancel in-flight requests when a new tick fires.
   * Includes retry with configurable delay for transient failures.
   * Completes when stopPolling() is called.
   */
  poll<T>(
    source: () => Observable<T>,
    config: Partial<PollingConfig> = {},
  ): Observable<T> {
    const { intervalMs, retryAttempts, retryDelayMs } = { ...DEFAULT_CONFIG, ...config };

    return timer(0, intervalMs).pipe(
      takeUntil(this.stop$),
      switchMap(() => source()),
      retry({
        count: retryAttempts,
        delay: retryDelayMs,
        resetOnSuccess: true,
      }),
      share(),
    );
  }

  stopPolling(): void {
    this.stop$.next();
  }
}
