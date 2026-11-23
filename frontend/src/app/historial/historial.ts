import { Component, OnInit, computed, inject, signal } from '@angular/core';
import { DatePipe } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { ApiService, mensajeError, urlMailpit } from '../api.service';
import { HistorialEnvio, etiquetaEstado } from '../modelos';

@Component({
  selector: 'app-historial',
  imports: [DatePipe, FormsModule],
  templateUrl: './historial.html',
  styleUrl: './historial.scss',
})
export class HistorialPagina implements OnInit {
  private readonly api = inject(ApiService);

  protected readonly etiqueta = etiquetaEstado;
  protected readonly mailpit = urlMailpit();
  protected readonly registros = signal<HistorialEnvio[]>([]);
  protected readonly cargando = signal(true);
  protected readonly error = signal<string | null>(null);
  protected readonly filtroResultado = signal<'' | 'enviado' | 'fallido'>('');
  protected readonly filtroOrigen = signal<'' | 'manual' | 'automatico'>('');

  protected readonly filtrados = computed(() =>
    this.registros().filter(
      (r) =>
        (!this.filtroResultado() || r.resultado === this.filtroResultado()) &&
        (!this.filtroOrigen() || r.origen === this.filtroOrigen()),
    ),
  );

  protected readonly totales = computed(() => {
    const r = this.registros();
    return {
      total: r.length,
      enviados: r.filter((x) => x.resultado === 'enviado').length,
      fallidos: r.filter((x) => x.resultado === 'fallido').length,
    };
  });

  ngOnInit(): void {
    this.cargar();
  }

  protected cargar(): void {
    this.cargando.set(true);
    this.error.set(null);
    this.api.historial(200).subscribe({
      next: (r) => {
        this.registros.set(r);
        this.cargando.set(false);
      },
      error: (e) => {
        this.cargando.set(false);
        this.error.set(mensajeError(e));
      },
    });
  }
}
