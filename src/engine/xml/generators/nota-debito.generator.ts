import { create } from 'xmlbuilder2';

/**
 * Generates SRI-compliant XML for Nota de Débito (tipo 05).
 * Based on: Ficha Técnica del Comprobante Electrónico - Nota de Débito v1.0.0
 */
export class NotaDebitoGenerator {
  generate(data: NotaDebitoData): string {
    const root = create({ version: '1.0', encoding: 'UTF-8' })
      .ele('notaDebito', {
        id: 'comprobante',
        version: '1.0.0',
      });

    this.buildInfoTributaria(root, data);
    this.buildInfoNotaDebito(root, data);
    this.buildMotivos(root, data);

    if (data.infoAdicional && data.infoAdicional.length > 0) {
      this.buildInfoAdicional(root, data);
    }

    return root.end({ prettyPrint: true });
  }

  private buildInfoTributaria(root: any, data: NotaDebitoData) {
    const info = root.ele('infoTributaria');
    info.ele('ambiente').txt(data.ambiente);
    info.ele('tipoEmision').txt('1');
    info.ele('razonSocial').txt(data.razonSocial);
    if (data.nombreComercial) {
      info.ele('nombreComercial').txt(data.nombreComercial);
    }
    info.ele('ruc').txt(data.ruc);
    info.ele('claveAcceso').txt(data.claveAcceso);
    info.ele('codDoc').txt('05');
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

  private buildInfoNotaDebito(root: any, data: NotaDebitoData) {
    const info = root.ele('infoNotaDebito');
    info.ele('fechaEmision').txt(data.fechaEmision);
    if (data.dirEstablecimiento) {
      info.ele('dirEstablecimiento').txt(data.dirEstablecimiento);
    }
    info.ele('tipoIdentificacionComprador').txt(data.tipoIdentificacionComprador);
    info.ele('razonSocialComprador').txt(data.razonSocialComprador);
    info.ele('identificacionComprador').txt(data.identificacionComprador);
    if (data.contribuyenteEspecial) {
      info.ele('contribuyenteEspecial').txt(data.contribuyenteEspecial);
    }
    info.ele('obligadoContabilidad').txt(data.obligadoContabilidad ?? 'NO');
    if (data.rise) {
      info.ele('rise').txt(data.rise);
    }
    info.ele('codDocModificado').txt(data.codDocModificado);
    info.ele('numDocModificado').txt(data.numDocModificado);
    info.ele('fechaEmisionDocSustento').txt(data.fechaEmisionDocSustento);
    info.ele('totalSinImpuestos').txt(this.decimal(data.totalSinImpuestos));
    // impuestos (XSD: <impuestos><impuesto>...)
    const impuestos = info.ele('impuestos');
    for (const imp of data.totalConImpuestos) {
      const i = impuestos.ele('impuesto');
      i.ele('codigo').txt(imp.codigo);
      i.ele('codigoPorcentaje').txt(imp.codigoPorcentaje);
      i.ele('tarifa').txt(this.decimal(imp.tarifa));
      i.ele('baseImponible').txt(this.decimal(imp.baseImponible));
      i.ele('valor').txt(this.decimal(imp.valor));
    }
    info.ele('valorTotal').txt(this.decimal(data.valorTotal));

    // pagos
    if (data.pagos && data.pagos.length > 0) {
      const pagos = info.ele('pagos');
      for (const p of data.pagos) {
        const pago = pagos.ele('pago');
        pago.ele('formaPago').txt(p.formaPago);
        pago.ele('total').txt(this.decimal(p.total));
        if (p.plazo != null) {
          pago.ele('plazo').txt(String(p.plazo));
        }
        if (p.unidadTiempo) {
          pago.ele('unidadTiempo').txt(p.unidadTiempo);
        }
      }
    }
  }

  private buildMotivos(root: any, data: NotaDebitoData) {
    const motivos = root.ele('motivos');
    for (const m of data.motivos) {
      const motivo = motivos.ele('motivo');
      motivo.ele('razon').txt(m.razon);
      motivo.ele('valor').txt(this.decimal(m.valor));
    }
  }

  private buildInfoAdicional(root: any, data: NotaDebitoData) {
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

export interface NotaDebitoData {
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

  // infoNotaDebito
  fechaEmision: string; // DD/MM/AAAA
  dirEstablecimiento?: string;
  tipoIdentificacionComprador: string;
  razonSocialComprador: string;
  identificacionComprador: string;
  contribuyenteEspecial?: string;
  obligadoContabilidad?: string;
  rise?: string;
  codDocModificado: string;  // '01'=Factura, '03'=Liquidación, etc.
  numDocModificado: string;  // 'NNN-NNN-NNNNNNNNN'
  fechaEmisionDocSustento: string; // DD/MM/AAAA
  totalSinImpuestos: number;
  totalConImpuestos: TotalImpuestoND[];
  valorTotal: number;
  pagos?: PagoND[];

  // motivos
  motivos: MotivoND[];

  // infoAdicional
  infoAdicional?: CampoAdicional[];
}

export interface TotalImpuestoND {
  codigo: string;
  codigoPorcentaje: string;
  baseImponible: number;
  tarifa: number;
  valor: number;
}

export interface MotivoND {
  razon: string;
  valor: number;
}

export interface PagoND {
  formaPago: string;
  total: number;
  plazo?: number;
  unidadTiempo?: string;
}

export interface CampoAdicional {
  nombre: string;
  valor: string;
}
