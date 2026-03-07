import { XmlService } from './xml.service';
import { SriDocTypeCode } from '../../entities/enums';

describe('XmlService', () => {
  const service = new XmlService();

  const commonFields = {
    ambiente: '1',
    razonSocial: 'TEST S.A.',
    ruc: '0992191813001',
    claveAcceso: '0603202601099219181300110010010000000011234567813',
    establecimiento: '001',
    puntoEmision: '001',
    secuencial: '000000001',
    dirMatriz: 'Guayaquil',
    fechaEmision: '06/03/2026',
    obligadoContabilidad: 'SI',
  };

  it('should route FACTURA (01) to factura generator', () => {
    const data = {
      ...commonFields,
      tipoIdentificacionComprador: '04',
      razonSocialComprador: 'BUYER',
      identificacionComprador: '0706410164001',
      totalSinImpuestos: 100,
      totalDescuento: 0,
      totalConImpuestos: [{ codigo: '2', codigoPorcentaje: '0', baseImponible: 100, valor: 0 }],
      propina: 0,
      importeTotal: 100,
      moneda: 'DOLAR',
      pagos: [{ formaPago: '01', total: 100 }],
      detalles: [{
        codigoPrincipal: 'P1', descripcion: 'Test', cantidad: 1,
        precioUnitario: 100, descuento: 0, precioTotalSinImpuesto: 100,
        impuestos: [{ codigo: '2', codigoPorcentaje: '0', tarifa: 0, baseImponible: 100, valor: 0 }],
      }],
    };
    const xml = service.generate(SriDocTypeCode.FACTURA, data);
    expect(xml).toContain('<factura');
    expect(xml).toContain('<codDoc>01</codDoc>');
  });

  it('should route LIQUIDACION_COMPRAS (03) to liquidacion generator', () => {
    const data = {
      ...commonFields,
      tipoIdentificacionProveedor: '05',
      razonSocialProveedor: 'PROVEEDOR',
      identificacionProveedor: '0706410164',
      totalSinImpuestos: 100,
      totalDescuento: 0,
      totalConImpuestos: [{ codigo: '2', codigoPorcentaje: '0', baseImponible: 100, valor: 0 }],
      importeTotal: 100,
      pagos: [{ formaPago: '01', total: 100 }],
      detalles: [{
        codigoPrincipal: 'P1', descripcion: 'Test', cantidad: 1,
        precioUnitario: 100, descuento: 0, precioTotalSinImpuesto: 100,
        impuestos: [{ codigo: '2', codigoPorcentaje: '0', tarifa: 0, baseImponible: 100, valor: 0 }],
      }],
    };
    const xml = service.generate(SriDocTypeCode.LIQUIDACION_COMPRAS, data);
    expect(xml).toContain('<liquidacionCompra');
    expect(xml).toContain('<codDoc>03</codDoc>');
  });

  it('should route NOTA_CREDITO (04) to nota credito generator', () => {
    const data = {
      ...commonFields,
      tipoIdentificacionComprador: '04',
      razonSocialComprador: 'BUYER',
      identificacionComprador: '0706410164001',
      codDocModificado: '01',
      numDocModificado: '001-001-000000001',
      fechaEmisionDocSustento: '05/03/2026',
      totalSinImpuestos: 50,
      valorModificacion: 50,
      totalConImpuestos: [{ codigo: '2', codigoPorcentaje: '0', baseImponible: 50, valor: 0 }],
      motivo: 'Devolucion',
      detalles: [{
        descripcion: 'Test', cantidad: 1, precioUnitario: 50, precioTotalSinImpuesto: 50,
        impuestos: [{ codigo: '2', codigoPorcentaje: '0', tarifa: 0, baseImponible: 50, valor: 0 }],
      }],
    };
    const xml = service.generate(SriDocTypeCode.NOTA_CREDITO, data);
    expect(xml).toContain('<notaCredito');
    expect(xml).toContain('<codDoc>04</codDoc>');
  });

  it('should route NOTA_DEBITO (05) to nota debito generator', () => {
    const data = {
      ...commonFields,
      tipoIdentificacionComprador: '04',
      razonSocialComprador: 'BUYER',
      identificacionComprador: '0706410164001',
      codDocModificado: '01',
      numDocModificado: '001-001-000000001',
      fechaEmisionDocSustento: '05/03/2026',
      totalSinImpuestos: 20,
      totalConImpuestos: [{ codigo: '2', codigoPorcentaje: '0', baseImponible: 20, tarifa: 0, valor: 0 }],
      valorTotal: 20,
      motivos: [{ razon: 'Mora', valor: 20 }],
    };
    const xml = service.generate(SriDocTypeCode.NOTA_DEBITO, data);
    expect(xml).toContain('<notaDebito');
    expect(xml).toContain('<codDoc>05</codDoc>');
  });

  it('should route GUIA_REMISION (06) to guia remision generator', () => {
    const data = {
      ...commonFields,
      dirPartida: 'Bodega',
      razonSocialTransportista: 'TRANS S.A.',
      tipoIdentificacionTransportista: '04',
      rucTransportista: '0991234567001',
      fechaIniTransporte: '06/03/2026',
      fechaFinTransporte: '07/03/2026',
      placa: 'ABC-1234',
      destinatarios: [{
        identificacionDestinatario: '0706410164001',
        razonSocialDestinatario: 'DEST',
        dirDestinatario: 'Quito',
        motivoTraslado: 'Venta',
        detalles: [{ descripcion: 'Prod', cantidad: 10 }],
      }],
    };
    const xml = service.generate(SriDocTypeCode.GUIA_REMISION, data);
    expect(xml).toContain('<guiaRemision');
    expect(xml).toContain('<codDoc>06</codDoc>');
  });

  it('should route RETENCION (07) to retencion generator', () => {
    const data = {
      ...commonFields,
      tipoIdentificacionSujetoRetenido: '04',
      razonSocialSujetoRetenido: 'PROVEEDOR',
      identificacionSujetoRetenido: '0706410164001',
      periodoFiscal: '03/2026',
      parteRel: 'NO',
      docsSustento: [{
        codSustento: '01', codDocSustento: '01',
        numDocSustento: '001-001-000000001',
        fechaEmisionDocSustento: '05/03/2026',
        pagoLocExt: '01', totalSinImpuestos: 100, importeTotal: 100,
        impuestosDocSustento: [
          { codImpuestoDocSustento: '2', codigoPorcentaje: '0', baseImponible: 100, tarifa: 0, valorImpuesto: 0 },
        ],
        retenciones: [
          { codigo: '1', codigoRetencion: '312', baseImponible: 100, porcentajeRetener: 1, valorRetenido: 1 },
        ],
      }],
    };
    const xml = service.generate(SriDocTypeCode.RETENCION, data);
    expect(xml).toContain('<comprobanteRetencion');
    expect(xml).toContain('<codDoc>07</codDoc>');
    expect(xml).toContain('version="2.0.0"');
  });

  it('should throw for unsupported document type', () => {
    expect(() => service.generate('99' as SriDocTypeCode, {})).toThrow(
      'Unsupported document type: 99',
    );
  });
});
