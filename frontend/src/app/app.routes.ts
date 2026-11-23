import { Routes } from '@angular/router';

export const routes: Routes = [
  { path: '', pathMatch: 'full', redirectTo: 'facturas' },
  {
    path: 'facturas',
    title: 'Facturas · Monolegal',
    loadComponent: () => import('./facturas/facturas').then((m) => m.FacturasPagina),
  },
  {
    path: 'programacion',
    title: 'Programación · Monolegal',
    loadComponent: () => import('./programacion/programacion').then((m) => m.ProgramacionPagina),
  },
  {
    path: 'historial',
    title: 'Historial · Monolegal',
    loadComponent: () => import('./historial/historial').then((m) => m.HistorialPagina),
  },
  { path: '**', redirectTo: 'facturas' },
];
