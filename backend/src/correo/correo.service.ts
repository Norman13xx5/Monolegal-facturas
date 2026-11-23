import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { existsSync } from 'node:fs';
import { join } from 'node:path';
import { createTransport, type Transporter } from 'nodemailer';
import type { EstadoFactura } from '../comun/estados.js';

export interface DatosCorreoFactura {
  destinatario: string;
  empresa: string;
  contacto?: string;
  numero: string;
  concepto: string;
  valor: number;
  fechaVencimiento: Date;
  estadoAnterior: EstadoFactura;
}

const VERDE = '#AED831';
const VERDE_OSCURO = '#5F7A12';
const TEXTO = '#424242';
const CID_PIN = 'pin-monolegal';

const pesos = new Intl.NumberFormat('es-CO', {
  style: 'currency',
  currency: 'COP',
  maximumFractionDigits: 0,
});
const fecha = new Intl.DateTimeFormat('es-CO', {
  day: 'numeric',
  month: 'long',
  year: 'numeric',
  timeZone: 'America/Bogota',
});

function escapar(texto: string): string {
  return texto
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
}

@Injectable()
export class CorreoService {
  private readonly logger = new Logger(CorreoService.name);
  private readonly transporte: Transporter;
  private readonly remitente: string;
  private readonly rutaPin = join(process.cwd(), 'assets', 'pin-monolegal.png');

  constructor(config: ConfigService) {
    this.remitente = config.get<string>(
      'CORREO_REMITENTE',
      'Monolegal <facturacion@monolegal.test>',
    );
    this.transporte = createTransport({
      host: config.get<string>('SMTP_HOST', 'localhost'),
      port: Number(config.get('SMTP_PORT', 1025)),
      secure: config.get('SMTP_SECURE') === 'true',
      auth: config.get('SMTP_USER')
        ? { user: config.get('SMTP_USER'), pass: config.get('SMTP_PASS') }
        : undefined,
    });
  }

  /** Envía el correo correspondiente al estado de la factura. Lanza error si el SMTP lo rechaza. */
  async enviarRecordatorio(datos: DatosCorreoFactura): Promise<string> {
    const { asunto, html, texto } = this.componer(datos);
    const conPin = existsSync(this.rutaPin);
    if (!conPin) this.logger.warn(`No se encontró ${this.rutaPin}; el correo sale sin logo.`);

    const info = await this.transporte.sendMail({
      from: this.remitente,
      to: datos.destinatario,
      subject: asunto,
      text: texto,
      html: html(conPin),
      attachments: conPin ? [{ filename: 'monolegal.png', path: this.rutaPin, cid: CID_PIN }] : [],
    });
    return info.messageId;
  }

  private componer(d: DatosCorreoFactura) {
    const valor = pesos.format(d.valor);
    const vence = fecha.format(d.fechaVencimiento);
    const saludo = d.contacto ? `Hola, ${d.contacto}:` : `Hola, equipo de ${d.empresa}:`;

    const esSegundo = d.estadoAnterior === 'primerrecordatorio';
    const asunto = esSegundo
      ? `Factura ${d.numero}: segundo recordatorio de pago`
      : `Factura ${d.numero}: su servicio va a ser desactivado`;
    const titulo = esSegundo ? 'Segundo recordatorio de pago' : 'Aviso de desactivación';
    const colorAviso = esSegundo ? '#B54708' : '#B42318';
    const fondoAviso = esSegundo ? '#FFF4E5' : '#FEECEB';
    const mensaje = esSegundo
      ? 'No hemos registrado el pago de la siguiente factura, por lo que ha pasado a <strong>segundo recordatorio</strong>. Le invitamos a realizar el pago para evitar la suspensión del servicio.'
      : 'La siguiente factura continúa sin pago después del segundo recordatorio. Por este motivo, <strong>su servicio va a ser desactivado</strong>. Si ya realizó el pago, por favor envíenos el soporte.';
    const mensajePlano = mensaje.replace(/<\/?strong>/g, '');

    const texto = [
      saludo,
      '',
      mensajePlano,
      '',
      `Empresa: ${d.empresa}`,
      `Factura: ${d.numero}`,
      `Concepto: ${d.concepto}`,
      `Valor: ${valor}`,
      `Vencimiento: ${vence}`,
      '',
      'Monolegal',
      'Prueba técnica · no es una comunicación oficial de Monolegal.',
    ].join('\n');

    const fila = (etiqueta: string, valorCelda: string) =>
      `<tr><td style="padding:6px 0;color:#858585">${etiqueta}</td><td style="padding:6px 0;text-align:right;color:${TEXTO};font-weight:600">${escapar(valorCelda)}</td></tr>`;

    const html = (conPin: boolean) => `<!doctype html>
<html lang="es"><body style="margin:0;background:#F4F6F0;font-family:Roboto,Arial,sans-serif;color:${TEXTO}">
<table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background:#F4F6F0;padding:24px 0"><tr><td align="center">
<table role="presentation" width="560" cellpadding="0" cellspacing="0" style="max-width:560px;width:100%;background:#fff;border-radius:8px;overflow:hidden">
  <tr><td style="background:${VERDE};padding:16px 24px">
    ${conPin ? `<img src="cid:${CID_PIN}" width="28" height="28" alt="" style="vertical-align:middle">` : ''}
    <span style="vertical-align:middle;font-size:22px;font-weight:900;color:#1F2A05;margin-left:8px">Monolegal</span>
  </td></tr>
  <tr><td style="padding:24px">
    <div style="display:inline-block;background:${fondoAviso};color:${colorAviso};font-weight:700;padding:6px 12px;border-radius:999px;font-size:13px">${titulo}</div>
    <p style="margin:20px 0 8px">${escapar(saludo)}</p>
    <p style="margin:0 0 20px;line-height:1.5">${mensaje}</p>
    <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="border-top:1px solid #EEE;border-bottom:1px solid #EEE;font-size:14px">
      ${fila('Empresa', d.empresa)}
      ${fila('Factura', d.numero)}
      ${fila('Concepto', d.concepto)}
      ${fila('Valor', valor)}
      ${fila('Vencimiento', vence)}
    </table>
    <p style="margin:20px 0 0;font-size:14px">Cordialmente,<br><strong style="color:${VERDE_OSCURO}">Equipo de cartera · Monolegal</strong></p>
  </td></tr>
  <tr><td style="background:#FAFAFA;padding:12px 24px;font-size:12px;color:#858585">
    Prueba técnica · no es una comunicación oficial de Monolegal.
  </td></tr>
</table></td></tr></table></body></html>`;

    return { asunto, html, texto };
  }
}
