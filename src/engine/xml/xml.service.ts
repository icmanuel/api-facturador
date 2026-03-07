import { Injectable } from '@nestjs/common';
import { SriDocTypeCode } from '../../entities/enums';
import { FacturaGenerator } from './generators/factura.generator';
import { RetencionGenerator } from './generators/retencion.generator';
import { NotaCreditoGenerator } from './generators/nota-credito.generator';
import { NotaDebitoGenerator } from './generators/nota-debito.generator';
import { GuiaRemisionGenerator } from './generators/guia-remision.generator';
import { LiquidacionComprasGenerator } from './generators/liquidacion-compras.generator';

@Injectable()
export class XmlService {
  private readonly facturaGen = new FacturaGenerator();
  private readonly retencionGen = new RetencionGenerator();
  private readonly notaCreditoGen = new NotaCreditoGenerator();
  private readonly notaDebitoGen = new NotaDebitoGenerator();
  private readonly guiaRemisionGen = new GuiaRemisionGenerator();
  private readonly liquidacionComprasGen = new LiquidacionComprasGenerator();

  /**
   * Generate SRI-compliant XML for a document.
   * Returns the XML string (unsigned).
   */
  generate(docType: SriDocTypeCode, data: any): string {
    switch (docType) {
      case SriDocTypeCode.FACTURA:
        return this.facturaGen.generate(data);
      case SriDocTypeCode.RETENCION:
        return this.retencionGen.generate(data);
      case SriDocTypeCode.NOTA_CREDITO:
        return this.notaCreditoGen.generate(data);
      case SriDocTypeCode.NOTA_DEBITO:
        return this.notaDebitoGen.generate(data);
      case SriDocTypeCode.GUIA_REMISION:
        return this.guiaRemisionGen.generate(data);
      case SriDocTypeCode.LIQUIDACION_COMPRAS:
        return this.liquidacionComprasGen.generate(data);
      default:
        throw new Error(`Unsupported document type: ${docType}`);
    }
  }
}
