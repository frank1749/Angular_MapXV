// Example service using Signals and HttpClient
// Copy and modify this as a template for your services

import { Injectable, signal } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { toSignal } from '@angular/core/rxjs-interop';

export interface User {
  id: number;
  name: string;
  email: string;
}

@Injectable({
  providedIn: 'root'
})
export class ExampleService {
  private readonly apiUrl = 'https://api.example.com/users';
  
  // Signal for data
  users = signal<User[]>([]);
  
  // Signal for loading state
  isLoading = signal(false);
  
  // Signal for errors
  error = signal<string | null>(null);

  constructor(private http: HttpClient) { }

  // Example: Fetch data with toSignal (automatic conversion from Observable to Signal)
  fetchUsers() {
    this.isLoading.set(true);
    return toSignal(
      this.http.get<User[]>(this.apiUrl),
      { initialValue: [] }
    );
  }

  // Example: Add a user
  addUser(user: User) {
    return this.http.post<User>(this.apiUrl, user);
  }

  // Example: Delete a user
  deleteUser(id: number) {
    return this.http.delete(`${this.apiUrl}/${id}`);
  }
}
