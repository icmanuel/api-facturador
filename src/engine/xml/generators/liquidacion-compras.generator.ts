import { create } from 'xmlbuilder2';

/**
 * Generates SRI-compliant XML for Liquidación de Compras (tipo 03).
 * Based on: Ficha Técnica del Comprobante Electrónico - Liquidación de Compras de Bienes y Prestación de Servicios v1.1.0
 *
 * Similar to Factura but:
 * - Root element: <liquidacionCompra> (version 1.1.0)
 * - Info section: <infoLiquidacionCompra> instead of <infoFactura>
 * - Uses proveedor (provider) instead of comprador (buyer)
 * - The issuer is the buyer, the provider is the informal seller
 */
export class LiquidacionComprasGenerator {
  generate(data: LiquidacionComprasData): string {
    const root = create({ version: '1.0', encoding: 'UTF-8' })
      .ele('liquidacionCompra', {
        id: 'comprobante',
        version: '1.1.0',
      });

    this.buildInfoTributaria(root, data);
    this.buildInfoLiquidacionCompra(root, data);
    this.buildDetalles(root, data);

    if (data.reembolsos && data.reembolsos.length > 0) {
      this.buildReembolsos(root, data);
    }

    if (data.infoAdicional && data.infoAdicional.length > 0) {
      this.buildInfoAdicional(root, data);
    }

    return root.end({ prettyPrint: true });
  }

  private buildInfoTributaria(root: any, data: LiquidacionComprasData) {
    const info = root.ele('infoTributaria');
    info.ele('ambiente').txt(data.ambiente);
    info.ele('tipoEmision').txt('1');
    info.ele('razonSocial').txt(data.razonSocial);
    if (data.nombreComercial) {
      info.ele('nombreComercial').txt(data.nombreComercial);
    }
    info.ele('ruc').txt(data.ruc);
    info.ele('claveAcceso').txt(data.claveAcceso);
    info.ele('codDoc').txt('03');
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

  private buildInfoLiquidacionCompra(root: any, data: LiquidacionComprasData) {
    const info = root.ele('infoLiquidacionCompra');
    info.ele('fechaEmision').txt(data.fechaEmision);
    if (data.dirEstablecimiento) {
      info.ele('dirEstablecimiento').txt(data.dirEstablecimiento);
    }
    if (data.contribuyenteEspecial) {
      info.ele('contribuyenteEspecial').txt(data.contribuyenteEspecial);
    }
    info.ele('obligadoContabilidad').txt(data.obligadoContabilidad ?? 'NO');
    info.ele('tipoIdentificacionProveedor').txt(data.tipoIdentificacionProveedor);
    info.ele('razonSocialProveedor').txt(data.razonSocialProveedor);
    info.ele('identificacionProveedor').txt(data.identificacionProveedor);
    if (data.direccionProveedor) {
      info.ele('direccionProveedor').txt(data.direccionProveedor);
    }
    info.ele('totalSinImpuestos').txt(this.decimal(data.totalSinImpuestos));
    info.ele('totalDescuento').txt(this.decimal(data.totalDescuento));

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

    info.ele('importeTotal').txt(this.decimal(data.importeTotal));
    info.ele('moneda').txt(data.moneda ?? 'DOLAR');

    const pagos = info.ele('pagos');
    for (const pago of data.pagos) {
      const p = pagos.ele('pago');
      p.ele('formaPago').txt(pago.formaPago);
      p.ele('total').txt(this.decimal(pago.total));
      if (pago.plazo) p.ele('plazo').txt(String(pago.plazo));
      if (pago.unidadTiempo) p.ele('unidadTiempo').txt(pago.unidadTiempo);
    }
  }

  private buildDetalles(root: any, data: LiquidacionComprasData) {
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

      if (det.detallesAdicionales && det.detallesAdicionales.length > 0) {
        const da = d.ele('detallesAdicionales');
        for (const ad of det.detallesAdicionales) {
          da.ele('detAdicional', { nombre: ad.nombre, valor: ad.valor });
        }
      }

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

  private buildReembolsos(root: any, data: LiquidacionComprasData) {
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

  private buildInfoAdicional(root: any, data: LiquidacionComprasData) {
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

export interface LiquidacionComprasData {
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

  // infoLiquidacionCompra
  fechaEmision: string;
  dirEstablecimiento?: string;
  contribuyenteEspecial?: string;
  obligadoContabilidad?: string;
  tipoIdentificacionProveedor: string;
  razonSocialProveedor: string;
  identificacionProveedor: string;
  direccionProveedor?: string;
  totalSinImpuestos: number;
  totalDescuento: number;
  totalConImpuestos: TotalImpuestoLC[];
  importeTotal: number;
  moneda?: string;
  pagos: PagoLC[];

  // Reembolso (optional)
  codDocReemb?: string;
  totalComprobantesReembolso?: number;
  totalBaseImponibleReembolso?: number;
  totalImpuestoReembolso?: number;
  reembolsos?: ReembolsoDetalleLC[];

  detalles: DetalleLiquidacion[];
  infoAdicional?: CampoAdicional[];
}

export interface TotalImpuestoLC {
  codigo: string;
  codigoPorcentaje: string;
  descuentoAdicional?: number;
  baseImponible: number;
  valor: number;
}

export interface PagoLC {
  formaPago: string;
  total: number;
  plazo?: number;
  unidadTiempo?: string;
}

export interface DetalleLiquidacion {
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

export interface ReembolsoDetalleLC {
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
  detalleImpuestos: ImpuestoReembolsoLC[];
}

export interface ImpuestoReembolsoLC {
  codigo: string;
  codigoPorcentaje: string;
  tarifa: number;
  baseImponibleReembolso: number;
  impuestoReembolso: number;
}
