import { create } from 'xmlbuilder2';

/**
 * Generates SRI-compliant XML for Comprobante de Retención (tipo 07).
 * Based on: Ficha Técnica del Comprobante Electrónico - Retención v2.0.0
 *
 * v2.0.0 key changes from v1.0.0:
 * - Uses <docsSustento>/<docSustento> to group retentions by source document
 * - Each docSustento contains: source doc info, source doc taxes, retentions, and payments
 * - Adds tipoSujetoRetenido and parteRel fields in infoCompRetencion
 */
export class RetencionGenerator {
  generate(data: RetencionData): string {
    const root = create({ version: '1.0', encoding: 'UTF-8' })
      .ele('comprobanteRetencion', {
        id: 'comprobante',
        version: '2.0.0',
      });

    this.buildInfoTributaria(root, data);
    this.buildInfoCompRetencion(root, data);
    this.buildDocsSustento(root, data);

    if (data.infoAdicional && data.infoAdicional.length > 0) {
      this.buildInfoAdicional(root, data);
    }

    return root.end({ prettyPrint: true });
  }

  private buildInfoTributaria(root: any, data: RetencionData) {
    const info = root.ele('infoTributaria');
    info.ele('ambiente').txt(data.ambiente);
    info.ele('tipoEmision').txt('1');
    info.ele('razonSocial').txt(data.razonSocial);
    if (data.nombreComercial) {
      info.ele('nombreComercial').txt(data.nombreComercial);
    }
    info.ele('ruc').txt(data.ruc);
    info.ele('claveAcceso').txt(data.claveAcceso);
    info.ele('codDoc').txt('07');
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

  private buildInfoCompRetencion(root: any, data: RetencionData) {
    const info = root.ele('infoCompRetencion');
    info.ele('fechaEmision').txt(data.fechaEmision);
    if (data.dirEstablecimiento) {
      info.ele('dirEstablecimiento').txt(data.dirEstablecimiento);
    }
    if (data.contribuyenteEspecial) {
      info.ele('contribuyenteEspecial').txt(data.contribuyenteEspecial);
    }
    info.ele('obligadoContabilidad').txt(data.obligadoContabilidad ?? 'NO');
    info.ele('tipoIdentificacionSujetoRetenido').txt(data.tipoIdentificacionSujetoRetenido);
    if (data.tipoSujetoRetenido) {
      info.ele('tipoSujetoRetenido').txt(data.tipoSujetoRetenido);
    }
    info.ele('parteRel').txt(data.parteRel ?? 'NO');
    info.ele('razonSocialSujetoRetenido').txt(data.razonSocialSujetoRetenido);
    info.ele('identificacionSujetoRetenido').txt(data.identificacionSujetoRetenido);
    info.ele('periodoFiscal').txt(data.periodoFiscal);
  }

  private buildDocsSustento(root: any, data: RetencionData) {
    const docsSustento = root.ele('docsSustento');

    for (const doc of data.docsSustento) {
      const ds = docsSustento.ele('docSustento');
      ds.ele('codSustento').txt(doc.codSustento);
      ds.ele('codDocSustento').txt(doc.codDocSustento);
      ds.ele('numDocSustento').txt(doc.numDocSustento.replace(/-/g, ''));
      ds.ele('fechaEmisionDocSustento').txt(doc.fechaEmisionDocSustento);
      ds.ele('fechaRegistroContable').txt(doc.fechaRegistroContable ?? doc.fechaEmisionDocSustento);
      if (doc.numAutDocSustento) {
        ds.ele('numAutDocSustento').txt(doc.numAutDocSustento);
      }
      ds.ele('pagoLocExt').txt(doc.pagoLocExt ?? '01');
      if (doc.tipoRegi != null) {
        ds.ele('tipoRegi').txt(doc.tipoRegi);
      }
      if (doc.paisEfecPago) {
        ds.ele('paisEfecPago').txt(doc.paisEfecPago);
      }
      if (doc.aplicConvDobTworki) {
        ds.ele('aplicConvDobTrib').txt(doc.aplicConvDobTworki);
      }
      if (doc.pagExtSujRetNorLeg) {
        ds.ele('pagExtSujRetNorLeg').txt(doc.pagExtSujRetNorLeg);
      }
      ds.ele('totalSinImpuestos').txt(this.decimal(doc.totalSinImpuestos));
      ds.ele('importeTotal').txt(this.decimal(doc.importeTotal));

      // impuestosDocSustento
      const impuestos = ds.ele('impuestosDocSustento');
      for (const imp of doc.impuestosDocSustento) {
        const i = impuestos.ele('impuestoDocSustento');
        i.ele('codImpuestoDocSustento').txt(imp.codImpuestoDocSustento);
        i.ele('codigoPorcentaje').txt(imp.codigoPorcentaje);
        i.ele('baseImponible').txt(this.decimal(imp.baseImponible));
        i.ele('tarifa').txt(this.decimal(imp.tarifa));
        i.ele('valorImpuesto').txt(this.decimal(imp.valorImpuesto));
      }

      // retenciones
      const retenciones = ds.ele('retenciones');
      for (const ret of doc.retenciones) {
        const r = retenciones.ele('retencion');
        r.ele('codigo').txt(ret.codigo);
        r.ele('codigoRetencion').txt(ret.codigoRetencion);
        r.ele('baseImponible').txt(this.decimal(ret.baseImponible));
        r.ele('porcentajeRetener').txt(this.decimal(ret.porcentajeRetener));
        r.ele('valorRetenido').txt(this.decimal(ret.valorRetenido));
      }

      // pagos (REQUIRED in v2.0.0 — SRI XSD mandates at least one pago)
      const pagosData = doc.pagos && doc.pagos.length > 0
        ? doc.pagos
        : [{ formaPago: '20', total: doc.importeTotal }];
      const pagos = ds.ele('pagos');
      for (const p of pagosData) {
        const pago = pagos.ele('pago');
        pago.ele('formaPago').txt(p.formaPago);
        pago.ele('total').txt(this.decimal(p.total));
      }
    }
  }

  private buildInfoAdicional(root: any, data: RetencionData) {
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

export interface RetencionData {
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

  // infoCompRetencion
  fechaEmision: string; // DD/MM/AAAA
  dirEstablecimiento?: string;
  contribuyenteEspecial?: string;
  obligadoContabilidad?: string;
  tipoIdentificacionSujetoRetenido: string;
  tipoSujetoRetenido?: string; // v2.0.0: '01'=persona natural, '02'=sociedad
  parteRel?: string;           // v2.0.0: 'SI' or 'NO' (default 'NO')
  razonSocialSujetoRetenido: string;
  identificacionSujetoRetenido: string;
  periodoFiscal: string; // MM/AAAA

  // v2.0.0: documents sustento (grouped retentions by source document)
  docsSustento: DocSustento[];

  // infoAdicional
  infoAdicional?: CampoAdicional[];
}

export interface DocSustento {
  codSustento: string;            // código sustento tributario (tabla 2 SRI)
  codDocSustento: string;         // '01'=Factura, '03'=Liquidación, etc.
  numDocSustento: string;         // 'NNN-NNN-NNNNNNNNN'
  fechaEmisionDocSustento: string; // DD/MM/AAAA
  fechaRegistroContable?: string;  // DD/MM/AAAA (defaults to fechaEmisionDocSustento)
  numAutDocSustento?: string;     // authorization number of source doc
  pagoLocExt?: string;            // '01'=local, '02'=exterior (default '01')
  tipoRegi?: string;              // regime type (for exterior payments)
  paisEfecPago?: string;          // country code (for exterior payments)
  aplicConvDobTworki?: string;    // double taxation agreement
  pagExtSujRetNorLeg?: string;    // exterior payment subject to retention
  totalSinImpuestos: number;
  importeTotal: number;
  impuestosDocSustento: ImpuestoDocSustento[];
  retenciones: RetencionItem[];
  pagos?: PagoRetencion[];
}

export interface ImpuestoDocSustento {
  codImpuestoDocSustento: string; // '2'=IVA, '3'=ICE, etc.
  codigoPorcentaje: string;        // porcentaje code (e.g., '0', '2', '3', '4')
  baseImponible: number;
  tarifa: number;
  valorImpuesto: number;
}

export interface RetencionItem {
  codigo: string;           // 1=Renta, 2=IVA, 6=ISD
  codigoRetencion: string;  // SRI retention code (e.g., '312', '332')
  baseImponible: number;
  porcentajeRetener: number;
  valorRetenido: number;
}

export interface PagoRetencion {
  formaPago: string;
  total: number;
}

export interface CampoAdicional {
  nombre: string;
  valor: string;
}
