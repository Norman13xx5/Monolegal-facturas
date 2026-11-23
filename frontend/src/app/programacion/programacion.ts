import { Component, DestroyRef, OnInit, computed, inject, signal } from '@angular/core';
import { DatePipe } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { ApiService, mensajeError } from '../api.service';
import { ConfiguracionCron } from '../modelos';

type Unidad = 'minutos' | 'horas';

const MAXIMO_MINUTOS = 1440;

@Component({
  selector: 'app-programacion',
  imports: [DatePipe, FormsModule],
  templateUrl: './programacion.html',
  styleUrl: './programacion.scss',
})
export class ProgramacionPagina implements OnInit {
  private readonly api = inject(ApiService);
  private readonly destroyRef = inject(DestroyRef);

  protected readonly config = signal<ConfiguracionCron | null>(null);
  protected readonly guardando = signal(false);
  protected readonly mensaje = signal<{ tipo: 'exito' | 'error'; texto: string } | null>(null);

  // Formulario
  protected readonly activo = signal(false);
  protected readonly cantidad = signal<number | null>(5);
  protected readonly unidad = signal<Unidad>('minutos');

  protected readonly intervaloMinutos = computed(() => {
    const c = this.cantidad();
    if (c === null || !Number.isFinite(c)) return null;
    return this.unidad() === 'horas' ? c * 60 : c;
  });

  protected readonly errorIntervalo = computed(() => {
    const m = this.intervaloMinutos();
    const c = this.cantidad();
    if (m === null) return 'Escriba un número.';
    if (!Number.isInteger(c)) return 'Use un número entero.';
    if (m < 1) return 'El mínimo es 1 minuto.';
    if (m > MAXIMO_MINUTOS) return 'El máximo es 24 horas (1440 minutos).';
    return null;
  });

  protected readonly hayCambios = computed(() => {
    const c = this.config();
    return !!c && (c.activo !== this.activo() || c.intervaloMinutos !== this.intervaloMinutos());
  });

  ngOnInit(): void {
    this.cargar(true);
    // Refresca última / próxima ejecución mientras la vista está abierta.
    const id = setInterval(() => this.cargar(false), 10_000);
    this.destroyRef.onDestroy(() => clearInterval(id));
  }

  protected cargar(rellenarFormulario: boolean): void {
    this.api.cron().subscribe({
      next: (c) => {
        this.config.set(c);
        if (rellenarFormulario) this.rellenar(c);
      },
      error: (e) => this.mensaje.set({ tipo: 'error', texto: mensajeError(e) }),
    });
  }

  protected guardar(): void {
    const minutos = this.intervaloMinutos();
    if (this.errorIntervalo() || minutos === null) return;
    this.guardando.set(true);
    this.mensaje.set(null);
    this.api.guardarCron(this.activo(), minutos).subscribe({
      next: (c) => {
        this.guardando.set(false);
        this.config.set(c);
        this.rellenar(c);
        this.mensaje.set({
          tipo: 'exito',
          texto: c.activo
            ? `Guardado. El envío automático se ejecutará cada ${this.describir(c.intervaloMinutos)}.`
            : 'Guardado. El envío automático está desactivado.',
        });
      },
      error: (e) => {
        this.guardando.set(false);
        this.mensaje.set({ tipo: 'error', texto: mensajeError(e) });
      },
    });
  }

  protected descartar(): void {
    const c = this.config();
    if (c) this.rellenar(c);
  }

  protected describir(minutos: number): string {
    if (minutos % 60 === 0) {
      const h = minutos / 60;
      return h === 1 ? '1 hora' : `${h} horas`;
    }
    return minutos === 1 ? '1 minuto' : `${minutos} minutos`;
  }

  private rellenar(c: ConfiguracionCron): void {
    this.activo.set(c.activo);
    if (c.intervaloMinutos >= 60 && c.intervaloMinutos % 60 === 0) {
      this.cantidad.set(c.intervaloMinutos / 60);
      this.unidad.set('horas');
    } else {
      this.cantidad.set(c.intervaloMinutos);
      this.unidad.set('minutos');
    }
  }
}
