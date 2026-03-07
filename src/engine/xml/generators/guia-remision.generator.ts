import { create } from 'xmlbuilder2';

/**
 * Generates SRI-compliant XML for Guía de Remisión (tipo 06).
 * Based on: Ficha Técnica del Comprobante Electrónico - Guía de Remisión v1.1.0
 */
export class GuiaRemisionGenerator {
  generate(data: GuiaRemisionData): string {
    const root = create({ version: '1.0', encoding: 'UTF-8' })
      .ele('guiaRemision', {
        id: 'comprobante',
        version: '1.1.0',
      });

    this.buildInfoTributaria(root, data);
    this.buildInfoGuiaRemision(root, data);
    this.buildDestinatarios(root, data);

    if (data.infoAdicional && data.infoAdicional.length > 0) {
      this.buildInfoAdicional(root, data);
    }

    return root.end({ prettyPrint: true });
  }

  private buildInfoTributaria(root: any, data: GuiaRemisionData) {
    const info = root.ele('infoTributaria');
    info.ele('ambiente').txt(data.ambiente);
    info.ele('tipoEmision').txt('1');
    info.ele('razonSocial').txt(data.razonSocial);
    if (data.nombreComercial) {
      info.ele('nombreComercial').txt(data.nombreComercial);
    }
    info.ele('ruc').txt(data.ruc);
    info.ele('claveAcceso').txt(data.claveAcceso);
    info.ele('codDoc').txt('06');
    info.ele('estab').txt(data.establecimiento);
    info.ele('ptoEmi').txt(data.puntoEmision);
    info.ele('secuencial').txt(data.secuencial);
    info.ele('dirMatriz').txt(data.dirMatriz);
    if (data.regimenMicroempresas) {
      info.ele('regimenMicroempresas').txt('CONTRIBUYENTE RÉGIMEN MICROEMPRESAS');
    }
    if (data.agenteRetencion) {
      info.ele('agenteRetencion').txt(data.agenteRetencion);
    }
    if (data.contribuyenteRimpe) {
      info.ele('contribuyenteRimpe').txt(data.contribuyenteRimpe);
    }
  }

  private buildInfoGuiaRemision(root: any, data: GuiaRemisionData) {
    const info = root.ele('infoGuiaRemision');
    if (data.dirEstablecimiento) {
      info.ele('dirEstablecimiento').txt(data.dirEstablecimiento);
    }
    info.ele('dirPartida').txt(data.dirPartida);
    info.ele('razonSocialTransportista').txt(data.razonSocialTransportista);
    info.ele('tipoIdentificacionTransportista').txt(data.tipoIdentificacionTransportista);
    info.ele('rucTransportista').txt(data.rucTransportista);
    if (data.rise) {
      info.ele('rise').txt(data.rise);
    }
    info.ele('obligadoContabilidad').txt(data.obligadoContabilidad ?? 'NO');
    if (data.contribuyenteEspecial) {
      info.ele('contribuyenteEspecial').txt(data.contribuyenteEspecial);
    }
    info.ele('fechaIniTransporte').txt(data.fechaIniTransporte);
    info.ele('fechaFinTransporte').txt(data.fechaFinTransporte);
    info.ele('placa').txt(data.placa);
  }

  private buildDestinatarios(root: any, data: GuiaRemisionData) {
    const destinatarios = root.ele('destinatarios');
    for (const dest of data.destinatarios) {
      const d = destinatarios.ele('destinatario');
      d.ele('identificacionDestinatario').txt(dest.identificacionDestinatario);
      d.ele('razonSocialDestinatario').txt(dest.razonSocialDestinatario);
      d.ele('dirDestinatario').txt(dest.dirDestinatario);
      d.ele('motivoTraslado').txt(dest.motivoTraslado);
      if (dest.docAduaneroUnico) {
        d.ele('docAduaneroUnico').txt(dest.docAduaneroUnico);
      }
      if (dest.codEstabDestino) {
        d.ele('codEstabDestino').txt(dest.codEstabDestino);
      }
      if (dest.ruta) {
        d.ele('ruta').txt(dest.ruta);
      }
      if (dest.codDocSustento) {
        d.ele('codDocSustento').txt(dest.codDocSustento);
      }
      if (dest.numDocSustento) {
        d.ele('numDocSustento').txt(dest.numDocSustento);
      }
      if (dest.numAutDocSustento) {
        d.ele('numAutDocSustento').txt(dest.numAutDocSustento);
      }
      if (dest.fechaEmisionDocSustento) {
        d.ele('fechaEmisionDocSustento').txt(dest.fechaEmisionDocSustento);
      }

      // detalles del destinatario
      const detalles = d.ele('detalles');
      for (const det of dest.detalles) {
        const detEl = detalles.ele('detalle');
        if (det.codigoInterno) {
          detEl.ele('codigoInterno').txt(det.codigoInterno);
        }
        if (det.codigoAdicional) {
          detEl.ele('codigoAdicional').txt(det.codigoAdicional);
        }
        detEl.ele('descripcion').txt(det.descripcion);
        detEl.ele('cantidad').txt(this.decimal(det.cantidad, 6));
      }
    }
  }

  private buildInfoAdicional(root: any, data: GuiaRemisionData) {
    const info = root.ele('infoAdicional');
    for (const campo of data.infoAdicional!) {
      info.ele('campoAdicional', { nombre: campo.nombre }).txt(campo.valor);
    }
  }

  private decimal(value: number, decimals = 2): string {
    return value.toFixed(decimals);
  }
}

// ── Interfaces ──

export interface GuiaRemisionData {
  // infoTributaria
  ambiente: string;
  razonSocial: string;
  nombreComercial?: string;
  ruc: string;
  claveAcceso: string;
  establecimiento: string;
  puntoEmision: string;
  secuencial: string;
  dirMatriz: string;
  regimenMicroempresas?: boolean;
  agenteRetencion?: string;
  contribuyenteRimpe?: string;

  // infoGuiaRemision
  dirEstablecimiento?: string;
  dirPartida: string;
  razonSocialTransportista: string;
  tipoIdentificacionTransportista: string;
  rucTransportista: string;
  rise?: string;
  obligadoContabilidad?: string;
  contribuyenteEspecial?: string;
  fechaIniTransporte: string; // DD/MM/AAAA
  fechaFinTransporte: string; // DD/MM/AAAA
  placa: string;

  // destinatarios
  destinatarios: DestinatarioGR[];

  // infoAdicional
  infoAdicional?: CampoAdicional[];
}

export interface DestinatarioGR {
  identificacionDestinatario: string;
  razonSocialDestinatario: string;
  dirDestinatario: string;
  motivoTraslado: string;
  docAduaneroUnico?: string;
  codEstabDestino?: string;
  ruta?: string;
  codDocSustento?: string;    // '01'=Factura, etc.
  numDocSustento?: string;    // 'NNN-NNN-NNNNNNNNN'
  numAutDocSustento?: string; // Número autorización del doc sustento
  fechaEmisionDocSustento?: string; // DD/MM/AAAA
  detalles: DetalleDestinatarioGR[];
}

export interface DetalleDestinatarioGR {
  codigoInterno?: string;
  codigoAdicional?: string;
  descripcion: string;
  cantidad: number;
}

export interface CampoAdicional {
  nombre: string;
  valor: string;
}
