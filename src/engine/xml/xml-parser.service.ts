import { Injectable, BadRequestException } from '@nestjs/common';
import { convert } from 'xmlbuilder2';

/**
 * Parses SRI-compliant XML documents and extracts metadata
 * needed to persist in the documents table.
 */
@Injectable()
export class XmlParserService {
  /**
   * Parse an SRI XML string and extract key metadata.
   * Supports: factura, notaCredito, notaDebito, comprobanteRetencion, guiaRemision, liquidacionCompra.
   */
  parse(xml: string): ParsedXmlMetadata {
    let root: any;
    try {
      root = convert(xml, { format: 'object' }) as any;
    } catch {
      throw new BadRequestException('El XML proporcionado no es válido o no se pudo parsear.');
    }

    // Detect root element (factura, notaCredito, etc.)
    const rootTag = this.detectRootTag(root);
    if (!rootTag) {
      throw new BadRequestException(
        'No se encontró un elemento raíz de comprobante SRI válido. ' +
        'Se espera: factura, notaCredito, notaDebito, comprobanteRetencion, guiaRemision o liquidacionCompra.',
      );
    }

    const doc = root[rootTag];
    const infoTrib = doc.infoTributaria;
    if (!infoTrib) {
      throw new BadRequestException('El XML no contiene el elemento <infoTributaria>.');
    }

    const codDoc = this.text(infoTrib.codDoc);
    const claveAcceso = this.text(infoTrib.claveAcceso);
    const ruc = this.text(infoTrib.ruc);
    const estab = this.text(infoTrib.estab);
    const ptoEmi = this.text(infoTrib.ptoEmi);
    const secuencial = this.text(infoTrib.secuencial);
    const ambiente = this.text(infoTrib.ambiente);

    if (!claveAcceso || claveAcceso.length !== 49) {
      throw new BadRequestException('La claveAcceso en el XML debe tener exactamente 49 dígitos.');
    }
    if (!codDoc) {
      throw new BadRequestException('El XML no contiene <codDoc> en infoTributaria.');
    }
    if (!ruc || ruc.length !== 13) {
      throw new BadRequestException('El RUC en el XML debe tener 13 dígitos.');
    }

    // Extract buyer/totals from the info section (infoFactura, infoNotaCredito, etc.)
    const infoSection = this.findInfoSection(doc, rootTag);
    const buyerInfo = this.extractBuyerInfo(infoSection);
    const totals = this.extractTotals(infoSection);

    const fullSequential = `${estab}-${ptoEmi}-${secuencial}`;

    return {
      codDoc,
      claveAcceso,
      ruc,
      establecimiento: estab,
      puntoEmision: ptoEmi,
      secuencial: fullSequential,
      ambiente,
      fechaEmision: this.text(infoSection?.fechaEmision) || '',
      buyerName: buyerInfo.name,
      buyerIdType: buyerInfo.idType,
      buyerId: buyerInfo.id,
      totalSinImpuestos: totals.subtotal,
      importeTotal: totals.total,
      totalImpuestos: totals.tax,
      totalDescuento: totals.discount,
    };
  }

  private detectRootTag(obj: any): string | null {
    const validRoots = [
      'factura', 'notaCredito', 'notaDebito',
      'comprobanteRetencion', 'guiaRemision', 'liquidacionCompra',
    ];
    for (const tag of validRoots) {
      if (obj[tag]) return tag;
    }
    return null;
  }

  private findInfoSection(doc: any, rootTag: string): any {
    const infoMap: Record<string, string> = {
      factura: 'infoFactura',
      notaCredito: 'infoNotaCredito',
      notaDebito: 'infoNotaDebito',
      comprobanteRetencion: 'infoCompRetencion',
      guiaRemision: 'infoGuiaRemision',
      liquidacionCompra: 'infoLiquidacionCompra',
    };
    return doc[infoMap[rootTag]] || null;
  }

  private extractBuyerInfo(info: any): { name: string; idType: string; id: string } {
    if (!info) return { name: '', idType: '', id: '' };

    // Different doc types use different tag names
    const name = this.text(info.razonSocialComprador)
      || this.text(info.razonSocialSujetoRetenido)
      || this.text(info.razonSocialProveedor)
      || this.text(info.razonSocialDestinatario)
      || '';

    const idType = this.text(info.tipoIdentificacionComprador)
      || this.text(info.tipoIdentificacionSujetoRetenido)
      || this.text(info.tipoIdentificacionProveedor)
      || '';

    const id = this.text(info.identificacionComprador)
      || this.text(info.identificacionSujetoRetenido)
      || this.text(info.identificacionProveedor)
      || this.text(info.rucTransportista)
      || '';

    return { name, idType, id };
  }

  private extractTotals(info: any): { subtotal: number; total: number; tax: number; discount: number } {
    if (!info) return { subtotal: 0, total: 0, tax: 0, discount: 0 };

    const subtotal = this.num(info.totalSinImpuestos) || this.num(info.totalComprobantesRetencion) || 0;
    const total = this.num(info.importeTotal) || subtotal;
    const discount = this.num(info.totalDescuento) || 0;

    // Calculate total tax from totalConImpuestos
    let tax = 0;
    const totalConImpuestos = info.totalConImpuestos;
    if (totalConImpuestos?.totalImpuesto) {
      const impuestos = Array.isArray(totalConImpuestos.totalImpuesto)
        ? totalConImpuestos.totalImpuesto
        : [totalConImpuestos.totalImpuesto];
      tax = impuestos.reduce((sum: number, imp: any) => sum + (this.num(imp.valor) || 0), 0);
    }

    return { subtotal, total, tax, discount };
  }

  /** Extract text value from a parsed XML node (handles #text wrapper from xmlbuilder2) */
  private text(node: any): string {
    if (node == null) return '';
    if (typeof node === 'string') return node;
    if (typeof node === 'number') return String(node);
    if (node['#'] != null) return String(node['#']);
    return '';
  }

  private num(node: any): number {
    const t = this.text(node);
    if (!t) return 0;
    const n = parseFloat(t);
    return isNaN(n) ? 0 : n;
  }
}

export interface ParsedXmlMetadata {
  codDoc: string;
  claveAcceso: string;
  ruc: string;
  establecimiento: string;
  puntoEmision: string;
  secuencial: string; // "001-001-000000001"
  ambiente: string;   // "1" or "2"
  fechaEmision: string;
  buyerName: string;
  buyerIdType: string;
  buyerId: string;
  totalSinImpuestos: number;
  importeTotal: number;
  totalImpuestos: number;
  totalDescuento: number;
}
