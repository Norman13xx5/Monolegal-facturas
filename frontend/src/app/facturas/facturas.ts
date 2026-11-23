import { Component, OnInit, computed, inject, signal } from '@angular/core';
import { CurrencyPipe, DatePipe } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { forkJoin } from 'rxjs';
import { ApiService, mensajeError, urlMailpit } from '../api.service';
import {
  ESTADOS,
  EstadoFactura,
  Factura,
  ResultadoProceso,
  ResumenFacturas,
  etiquetaEstado,
} from '../modelos';

interface Aviso {
  tipo: 'exito' | 'error' | 'info';
  texto: string;
  /** Muestra el enlace al buzón de correos. */
  conCorreos?: boolean;
}

@Component({
  selector: 'app-facturas',
  imports: [CurrencyPipe, DatePipe, FormsModule],
  templateUrl: './facturas.html',
  styleUrl: './facturas.scss',
})
export class FacturasPagina implements OnInit {
  private readonly api = inject(ApiService);

  protected readonly estados = ESTADOS;
  protected readonly etiqueta = etiquetaEstado;
  protected readonly mailpit = urlMailpit();

  protected readonly facturas = signal<Factura[]>([]);
  protected readonly resumen = signal<ResumenFacturas | null>(null);
  protected readonly cargando = signal(true);
  protected readonly ejecutando = signal(false);
  protected readonly reiniciando = signal(false);
  protected readonly aviso = signal<Aviso | null>(null);

  protected readonly filtroEstado = signal<EstadoFactura | ''>('');
  protected readonly filtroEmpresa = signal('');

  protected readonly empresas = computed(() =>
    [...new Set(this.facturas().map((f) => f.empresa?.nombre ?? '(sin empresa)'))].sort((a, b) =>
      a.localeCompare(b, 'es'),
    ),
  );

  protected readonly facturasFiltradas = computed(() =>
    this.facturas().filter(
      (f) =>
        (!this.filtroEstado() || f.estado === this.filtroEstado()) &&
        (!this.filtroEmpresa() || (f.empresa?.nombre ?? '(sin empresa)') === this.filtroEmpresa()),
    ),
  );

  /** Cuántas facturas procesaría el proceso ahora mismo. */
  protected readonly porProcesar = computed(
    () =>
      this.facturas().filter(
        (f) => f.estado === 'primerrecordatorio' || f.estado === 'segundorecordatorio',
      ).length,
  );

  ngOnInit(): void {
    this.cargar();
  }

  protected cargar(): void {
    this.cargando.set(true);
    forkJoin({ facturas: this.api.facturas(), resumen: this.api.resumen() }).subscribe({
      next: ({ facturas, resumen }) => {
        this.facturas.set(facturas);
        this.resumen.set(resumen);
        this.cargando.set(false);
      },
      error: (e) => {
        this.cargando.set(false);
        this.aviso.set({ tipo: 'error', texto: mensajeError(e) });
      },
    });
  }

  protected ejecutar(): void {
    this.ejecutando.set(true);
    this.aviso.set(null);
    this.api.ejecutarProceso().subscribe({
      next: (r) => {
        this.ejecutando.set(false);
        this.aviso.set(this.avisoProceso(r));
        this.cargar();
      },
      error: (e) => {
        this.ejecutando.set(false);
        this.aviso.set({ tipo: 'error', texto: mensajeError(e) });
      },
    });
  }

  protected reiniciar(): void {
    const ok = confirm(
      'Las 9 facturas de prueba volverán a su estado inicial. El historial de envíos se conserva. ¿Continuar?',
    );
    if (!ok) return;
    this.reiniciando.set(true);
    this.api.reiniciarDatos().subscribe({
      next: (r) => {
        this.reiniciando.set(false);
        this.aviso.set({
          tipo: 'info',
          texto: `Datos de prueba reiniciados: ${r.empresas} empresas y ${r.facturas} facturas en su estado inicial.`,
        });
        this.cargar();
      },
      error: (e) => {
        this.reiniciando.set(false);
        this.aviso.set({ tipo: 'error', texto: mensajeError(e) });
      },
    });
  }

  protected cambiarEstado(f: Factura, estado: EstadoFactura): void {
    if (estado === f.estado) return;
    const anterior = f.estado;
    this.api.cambiarEstado(f._id, estado).subscribe({
      next: () => {
        this.aviso.set({
          tipo: 'info',
          texto: `Factura ${f.numero}: estado cambiado de «${etiquetaEstado(anterior)}» a «${etiquetaEstado(estado)}».`,
        });
        this.cargar();
      },
      error: (e) => {
        this.aviso.set({ tipo: 'error', texto: mensajeError(e) });
        this.cargar();
      },
    });
  }

  private avisoProceso(r: ResultadoProceso): Aviso {
    if (!r.ejecutado) return { tipo: 'info', texto: r.motivo ?? 'El proceso no se ejecutó.' };
    if (r.procesadas === 0) {
      return {
        tipo: 'info',
        texto: 'No hay facturas en primer ni segundo recordatorio. No se envió ningún correo.',
      };
    }
    const base = `Proceso ejecutado: ${r.procesadas} facturas revisadas, ${r.enviadas} correos enviados`;
    return r.fallidas > 0
      ? {
          tipo: 'error',
          texto: `${base} y ${r.fallidas} fallidos (esas facturas no cambiaron de estado; ver Historial).`,
          conCorreos: r.enviadas > 0,
        }
      : { tipo: 'exito', texto: `${base}, 0 fallidos.`, conCorreos: true };
  }
}
