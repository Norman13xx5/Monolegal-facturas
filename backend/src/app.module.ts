import { Module } from '@nestjs/common';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { MongooseModule } from '@nestjs/mongoose';
import { ScheduleModule } from '@nestjs/schedule';
import { AppController } from './app.controller.js';
import { AppService } from './app.service.js';
import { CorreoService } from './correo/correo.service.js';
import { ConfiguracionCron, ConfiguracionCronSchema } from './cron/configuracion-cron.schema.js';
import { CronController } from './cron/cron.controller.js';
import { CronService } from './cron/cron.service.js';
import { DatosPruebaController } from './datos-prueba/datos-prueba.controller.js';
import { DatosPruebaService } from './datos-prueba/datos-prueba.service.js';
import { Empresa, EmpresaSchema } from './empresas/empresa.schema.js';
import { Factura, FacturaSchema } from './facturas/factura.schema.js';
import { FacturasController } from './facturas/facturas.controller.js';
import { FacturasService } from './facturas/facturas.service.js';
import { HistorialEnvio, HistorialEnvioSchema } from './historial/historial-envio.schema.js';
import { HistorialController } from './historial/historial.controller.js';
import { RecordatoriosController } from './recordatorios/recordatorios.controller.js';
import { RecordatoriosService } from './recordatorios/recordatorios.service.js';

@Module({
  imports: [
    ConfigModule.forRoot({ isGlobal: true }),
    MongooseModule.forRootAsync({
      inject: [ConfigService],
      useFactory: (config: ConfigService) => ({
        uri: config.get<string>('MONGO_URI', 'mongodb://localhost:27017/monolegal'),
      }),
    }),
    MongooseModule.forFeature([
      { name: Empresa.name, schema: EmpresaSchema },
      { name: Factura.name, schema: FacturaSchema },
      { name: HistorialEnvio.name, schema: HistorialEnvioSchema },
      { name: ConfiguracionCron.name, schema: ConfiguracionCronSchema },
    ]),
    ScheduleModule.forRoot(),
  ],
  controllers: [
    AppController,
    FacturasController,
    RecordatoriosController,
    HistorialController,
    CronController,
    DatosPruebaController,
  ],
  providers: [
    AppService,
    CorreoService,
    FacturasService,
    RecordatoriosService,
    CronService,
    DatosPruebaService,
  ],
})
export class AppModule {}
