// Example component using Signals
// Copy and modify this as a template for your components

import { Component, signal, computed, effect, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { MatCardModule } from '@angular/material/card';
import { MatButtonModule } from '@angular/material/button';
import { MatInputModule } from '@angular/material/input';
import { MatFormFieldModule } from '@angular/material/form-field';

@Component({
  selector: 'app-example',
  standalone: true,
  imports: [
    CommonModule,
    FormsModule,
    MatCardModule,
    MatButtonModule,
    MatInputModule,
    MatFormFieldModule
  ],
  template: `
    <mat-card>
      <h2>Example Component - Using Signals</h2>
      
      <!-- Display Signal Value -->
      <p>Counter: {{ counter() }}</p>
      <p>Doubled: {{ doubled() }}</p>
      
      <!-- Interactive Forms -->
      <mat-form-field>
        <mat-label>Enter name</mat-label>
        <input matInput [(ngModel)]="name" />
      </mat-form-field>
      
      <!-- Buttons -->
      <button mat-raised-button (click)="increment()" color="primary">
        Increment
      </button>
      <button mat-raised-button (click)="decrement()" color="accent">
        Decrement
      </button>
      
      <!-- Conditional Rendering -->
      @if (counter() > 5) {
        <p style="color: green;">Counter is greater than 5! 🎉</p>
      }
      
      <!-- List Rendering -->
      @if (items().length > 0) {
        <ul>
          @for (item of items(); track item) {
            <li>{{ item }}</li>
          }
        </ul>
      }
    </mat-card>
  `,
  styles: [`
    mat-card {
      max-width: 500px;
      margin: 20px auto;
      padding: 20px;
    }
    
    button {
      margin: 10px 5px;
    }
    
    mat-form-field {
      width: 100%;
      margin-bottom: 15px;
    }
  `]
})
export class ExampleComponent {
  // Basic Signal
  counter = signal(0);
  
  // Writable Signal
  name = '';
  
  // List Signal
  items = signal<string[]>([]);
  
  // Computed Signal (derived from another signal)
  doubled = computed(() => this.counter() * 2);

  constructor() {
    // Effect: Runs whenever counter changes
    effect(() => {
      console.log('Counter updated to:', this.counter());
    });
  }

  increment() {
    this.counter.update(c => c + 1);
  }

  decrement() {
    this.counter.update(c => c - 1);
  }

  addItem() {
    if (this.name.trim()) {
      this.items.update(items => [...items, this.name]);
      this.name = '';
    }
  }
}
