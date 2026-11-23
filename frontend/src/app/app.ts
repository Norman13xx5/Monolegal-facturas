import { Component, OnInit, inject, signal } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { RouterLink, RouterLinkActive, RouterOutlet } from '@angular/router';
import { urlMailpit } from './api.service';

interface EstadoSalud {
  api: 'ok';
  mongo: 'ok' | 'error';
  correo: 'ok' | 'error';
}

@Component({
  imports: [RouterOutlet, RouterLink, RouterLinkActive],
  selector: 'app-root',
  styleUrl: './app.scss',
  templateUrl: './app.html',
})
export class App implements OnInit {
  private readonly http = inject(HttpClient);

  protected readonly mailpit = urlMailpit();
  /** null = consultando; true/false = todos los servicios responden o no. */
  protected readonly serviciosOk = signal<boolean | null>(null);
  protected readonly detalleSalud = signal('Comprobando servicios…');

  ngOnInit(): void {
    this.http.get<EstadoSalud>('/api/salud').subscribe({
      next: (s) => {
        const ok = s.mongo === 'ok' && s.correo === 'ok';
        this.serviciosOk.set(ok);
        this.detalleSalud.set(
          `API: ${s.api} · Base de datos: ${s.mongo} · Correo: ${s.correo}`,
        );
      },
      error: () => {
        this.serviciosOk.set(false);
        this.detalleSalud.set('No se pudo contactar el backend.');
      },
    });
  }
}
