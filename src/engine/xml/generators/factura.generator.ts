import { create } from 'xmlbuilder2';

/**
 * Generates SRI-compliant XML for Factura (tipo 01).
 * Based on: Ficha Técnica del Comprobante Electrónico - Factura v2.1.0
 * Schema: https://celcer.sri.gob.ec/comprobantes-electronicos-ws/RecepcionComprobantesOffline?xsd=1
 */
export class FacturaGenerator {
  generate(data: FacturaData): string {
    const root = create({ version: '1.0', encoding: 'UTF-8' })
      .ele('factura', {
        id: 'comprobante',
        version: '2.1.0',
      });

    // ── infoTributaria ──
    this.buildInfoTributaria(root, data);

    // ── infoFactura ──
    this.buildInfoFactura(root, data);

    // ── reembolsos (optional, when codDocReemb=41) ──
    if (data.reembolsos && data.reembolsos.length > 0) {
      this.buildReembolsos(root, data);
    }

    // ── detalles ──
    this.buildDetalles(root, data);

    // ── infoAdicional (optional) ──
    if (data.infoAdicional && data.infoAdicional.length > 0) {
      this.buildInfoAdicional(root, data);
    }

    return root.end({ prettyPrint: true });
  }

  private buildInfoTributaria(root: any, data: FacturaData) {
    const info = root.ele('infoTributaria');
    info.ele('ambiente').txt(data.ambiente);
    info.ele('tipoEmision').txt('1'); // Normal
    info.ele('razonSocial').txt(data.razonSocial);
    if (data.nombreComercial) {
      info.ele('nombreComercial').txt(data.nombreComercial);
    }
    info.ele('ruc').txt(data.ruc);
    info.ele('claveAcceso').txt(data.claveAcceso);
    info.ele('codDoc').txt('01'); // Factura
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

  private buildInfoFactura(root: any, data: FacturaData) {
    const info = root.ele('infoFactura');
    info.ele('fechaEmision').txt(data.fechaEmision); // DD/MM/AAAA
    if (data.dirEstablecimiento) {
      info.ele('dirEstablecimiento').txt(data.dirEstablecimiento);
    }
    if (data.contribuyenteEspecial) {
      info.ele('contribuyenteEspecial').txt(data.contribuyenteEspecial);
    }
    info.ele('obligadoContabilidad').txt(data.obligadoContabilidad ?? 'NO');
    info.ele('tipoIdentificacionComprador').txt(data.tipoIdentificacionComprador);
    if (data.guiaRemision) {
      info.ele('guiaRemision').txt(data.guiaRemision);
    }
    info.ele('razonSocialComprador').txt(data.razonSocialComprador);
    info.ele('identificacionComprador').txt(data.identificacionComprador);
    if (data.direccionComprador) {
      info.ele('direccionComprador').txt(data.direccionComprador);
    }
    info.ele('totalSinImpuestos').txt(this.decimal(data.totalSinImpuestos));
    info.ele('totalDescuento').txt(this.decimal(data.totalDescuento));

    // totalConImpuestos
    const totalImpuestos = info.ele('totalConImpuestos');
    for (const imp of data.totalConImpuestos) {
      const ti = totalImpuestos.ele('totalImpuesto');
      ti.ele('codigo').txt(imp.codigo);
      ti.ele('codigoPorcentaje').txt(imp.codigoPorcentaje);
      if (imp.descuentoAdicional != null) {
        ti.ele('descuentoAdicional').txt(this.decimal(imp.descuentoAdicional));
      }
      ti.ele('baseImponible').txt(this.decimal(imp.baseImponible));
      ti.ele('valor').txt(this.decimal(imp.valor));
    }

    info.ele('propina').txt(this.decimal(data.propina ?? 0));
    info.ele('importeTotal').txt(this.decimal(data.importeTotal));
    info.ele('moneda').txt(data.moneda ?? 'DOLAR');

    // valorRetIva / valorRetRenta (opcionales)
    if (data.valorRetIva != null) {
      info.ele('valorRetIva').txt(this.decimal(data.valorRetIva));
    }
    if (data.valorRetRenta != null) {
      info.ele('valorRetRenta').txt(this.decimal(data.valorRetRenta));
    }

    // Reembolso totals (when codDocReemb=41)
    if (data.codDocReemb) {
      info.ele('codDocReemb').txt(data.codDocReemb);
      info.ele('totalComprobantesReembolso').txt(this.decimal(data.totalComprobantesReembolso ?? 0));
      info.ele('totalBaseImponibleReembolso').txt(this.decimal(data.totalBaseImponibleReembolso ?? 0));
      info.ele('totalImpuestoReembolso').txt(this.decimal(data.totalImpuestoReembolso ?? 0));
    }

    // pagos
    const pagos = info.ele('pagos');
    for (const pago of data.pagos) {
      const p = pagos.ele('pago');
      p.ele('formaPago').txt(pago.formaPago);
      p.ele('total').txt(this.decimal(pago.total));
      if (pago.plazo) p.ele('plazo').txt(String(pago.plazo));
      if (pago.unidadTiempo) p.ele('unidadTiempo').txt(pago.unidadTiempo);
    }
  }

  private buildDetalles(root: any, data: FacturaData) {
    const detalles = root.ele('detalles');
    for (const det of data.detalles) {
      const d = detalles.ele('detalle');
      d.ele('codigoPrincipal').txt(det.codigoPrincipal);
      if (det.codigoAuxiliar) {
        d.ele('codigoAuxiliar').txt(det.codigoAuxiliar);
      }
      d.ele('descripcion').txt(det.descripcion);
      d.ele('cantidad').txt(this.decimal(det.cantidad, 6));
      d.ele('precioUnitario').txt(this.decimal(det.precioUnitario, 6));
      d.ele('descuento').txt(this.decimal(det.descuento));
      d.ele('precioTotalSinImpuesto').txt(this.decimal(det.precioTotalSinImpuesto));

      // detallesAdicionales (optional)
      if (det.detallesAdicionales && det.detallesAdicionales.length > 0) {
        const da = d.ele('detallesAdicionales');
        for (const ad of det.detallesAdicionales) {
          da.ele('detAdicional', { nombre: ad.nombre, valor: ad.valor });
        }
      }

      // impuestos del detalle
      const impuestos = d.ele('impuestos');
      for (const imp of det.impuestos) {
        const i = impuestos.ele('impuesto');
        i.ele('codigo').txt(imp.codigo);
        i.ele('codigoPorcentaje').txt(imp.codigoPorcentaje);
        i.ele('tarifa').txt(this.decimal(imp.tarifa));
        i.ele('baseImponible').txt(this.decimal(imp.baseImponible));
        i.ele('valor').txt(this.decimal(imp.valor));
      }
    }
  }

  private buildReembolsos(root: any, data: FacturaData) {
    const reembolsos = root.ele('reembolsos');
    for (const r of data.reembolsos!) {
      const det = reembolsos.ele('reembolsoDetalle');
      det.ele('tipoIdentificacionProveedorReembolso').txt(r.tipoIdentificacionProveedorReembolso);
      det.ele('identificacionProveedorReembolso').txt(r.identificacionProveedorReembolso);
      det.ele('codPaisProveedorReembolso').txt(r.codPaisProveedorReembolso);
      det.ele('tipoProveedorReembolso').txt(r.tipoProveedorReembolso);
      det.ele('codDocReembolso').txt(r.codDocReembolso);
      det.ele('estabDocReembolso').txt(r.estabDocReembolso);
      det.ele('ptoEmiDocReembolso').txt(r.ptoEmiDocReembolso);
      det.ele('secuencialDocReembolso').txt(r.secuencialDocReembolso);
      det.ele('fechaEmisionDocReembolso').txt(r.fechaEmisionDocReembolso);
      det.ele('numeroautorizacionDocReemb').txt(r.numeroautorizacionDocReemb);

      const impuestos = det.ele('detalleImpuestos');
      for (const imp of r.detalleImpuestos) {
        const di = impuestos.ele('detalleImpuesto');
        di.ele('codigo').txt(imp.codigo);
        di.ele('codigoPorcentaje').txt(imp.codigoPorcentaje);
        di.ele('tarifa').txt(this.decimal(imp.tarifa));
        di.ele('baseImponibleReembolso').txt(this.decimal(imp.baseImponibleReembolso));
        di.ele('impuestoReembolso').txt(this.decimal(imp.impuestoReembolso));
      }
    }
  }

  private buildInfoAdicional(root: any, data: FacturaData) {
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

export interface FacturaData {
  // infoTributaria
  ambiente: string; // '1' test, '2' production
  razonSocial: string;
  nombreComercial?: string;
  ruc: string;
  claveAcceso: string;
  establecimiento: string; // '001'
  puntoEmision: string;    // '001'
  secuencial: string;      // '000000001'
  dirMatriz: string;
  regimenMicroempresas?: boolean;
  agenteRetencion?: string;
  contribuyenteRimpe?: string;

  // infoFactura
  fechaEmision: string; // DD/MM/AAAA
  dirEstablecimiento?: string;
  contribuyenteEspecial?: string;
  obligadoContabilidad?: string; // 'SI' | 'NO'
  tipoIdentificacionComprador: string; // '04'=RUC, '05'=CI, '06'=Pasaporte, '07'=CF
  guiaRemision?: string;
  razonSocialComprador: string;
  identificacionComprador: string;
  direccionComprador?: string;
  totalSinImpuestos: number;
  totalDescuento: number;
  totalConImpuestos: TotalImpuesto[];
  propina?: number;
  importeTotal: number;
  moneda?: string;
  valorRetIva?: number;
  valorRetRenta?: number;

  // Reembolso (when codDocReemb=41)
  codDocReemb?: string;
  totalComprobantesReembolso?: number;
  totalBaseImponibleReembolso?: number;
  totalImpuestoReembolso?: number;
  reembolsos?: ReembolsoDetalle[];

  pagos: Pago[];

  // detalles
  detalles: DetalleFactura[];

  // infoAdicional
  infoAdicional?: CampoAdicional[];
}

export interface TotalImpuesto {
  codigo: string;           // '2'=IVA, '3'=ICE, '5'=IRBPNR
  codigoPorcentaje: string; // '0'=0%, '2'=12%, '3'=14%, '4'=15%, '6'=no objeto, '7'=exento
  descuentoAdicional?: number;
  baseImponible: number;
  valor: number;
}

export interface Pago {
  formaPago: string; // SRI payment code (e.g., '01'=SIN UTILIZACIÓN DEL SISTEMA FINANCIERO, '20'=OTROS)
  total: number;
  plazo?: number;
  unidadTiempo?: string; // 'dias', 'meses'
}

export interface DetalleFactura {
  codigoPrincipal: string;
  codigoAuxiliar?: string;
  descripcion: string;
  cantidad: number;
  precioUnitario: number;
  descuento: number;
  precioTotalSinImpuesto: number;
  detallesAdicionales?: { nombre: string; valor: string }[];
  impuestos: ImpuestoDetalle[];
}

export interface ImpuestoDetalle {
  codigo: string;
  codigoPorcentaje: string;
  tarifa: number;
  baseImponible: number;
  valor: number;
}

export interface CampoAdicional {
  nombre: string;
  valor: string;
}

export interface ReembolsoDetalle {
  tipoIdentificacionProveedorReembolso: string;
  identificacionProveedorReembolso: string;
  codPaisProveedorReembolso: string;
  tipoProveedorReembolso: string;
  codDocReembolso: string;
  estabDocReembolso: string;
  ptoEmiDocReembolso: string;
  secuencialDocReembolso: string;
  fechaEmisionDocReembolso: string;
  numeroautorizacionDocReemb: string;
  detalleImpuestos: ImpuestoReembolso[];
}

export interface ImpuestoReembolso {
  codigo: string;
  codigoPorcentaje: string;
  tarifa: number;
  baseImponibleReembolso: number;
  impuestoReembolso: number;
}
