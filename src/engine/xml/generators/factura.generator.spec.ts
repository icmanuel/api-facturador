import { FacturaGenerator } from './factura.generator';

describe('FacturaGenerator', () => {
  const gen = new FacturaGenerator();

  const baseData = {
    ambiente: '1',
    razonSocial: 'EMPRESA TEST S.A.',
    ruc: '0992191813001',
    claveAcceso: '0603202601099219181300110010010000000011234567813',
    establecimiento: '001',
    puntoEmision: '001',
    secuencial: '000000001',
    dirMatriz: 'Guayaquil, Ecuador',
    fechaEmision: '06/03/2026',
    obligadoContabilidad: 'SI',
    tipoIdentificacionComprador: '04',
    razonSocialComprador: 'COMPRADOR TEST',
    identificacionComprador: '0706410164001',
    totalSinImpuestos: 100,
    totalDescuento: 0,
    totalConImpuestos: [
      { codigo: '2', codigoPorcentaje: '4', baseImponible: 100, valor: 15 },
    ],
    propina: 0,
    importeTotal: 115,
    moneda: 'DOLAR',
    pagos: [{ formaPago: '01', total: 115 }],
    detalles: [
      {
        codigoPrincipal: 'PROD001',
        descripcion: 'Producto test',
        cantidad: 1,
        precioUnitario: 100,
        descuento: 0,
        precioTotalSinImpuesto: 100,
        impuestos: [
          { codigo: '2', codigoPorcentaje: '4', tarifa: 15, baseImponible: 100, valor: 15 },
        ],
      },
    ],
  };

  it('should generate valid factura XML', () => {
    const xml = gen.generate(baseData);
    expect(xml).toContain('<factura');
    expect(xml).toContain('version="2.1.0"');
    expect(xml).toContain('<codDoc>01</codDoc>');
  });

  it('should include infoTributaria fields', () => {
    const xml = gen.generate(baseData);
    expect(xml).toContain('<ambiente>1</ambiente>');
    expect(xml).toContain('<tipoEmision>1</tipoEmision>');
    expect(xml).toContain('<razonSocial>EMPRESA TEST S.A.</razonSocial>');
    expect(xml).toContain(`<ruc>${baseData.ruc}</ruc>`);
    expect(xml).toContain(`<claveAcceso>${baseData.claveAcceso}</claveAcceso>`);
    expect(xml).toContain('<estab>001</estab>');
    expect(xml).toContain('<ptoEmi>001</ptoEmi>');
    expect(xml).toContain('<secuencial>000000001</secuencial>');
    expect(xml).toContain('<dirMatriz>Guayaquil, Ecuador</dirMatriz>');
  });

  it('should include infoFactura fields', () => {
    const xml = gen.generate(baseData);
    expect(xml).toContain('<fechaEmision>06/03/2026</fechaEmision>');
    expect(xml).toContain('<obligadoContabilidad>SI</obligadoContabilidad>');
    expect(xml).toContain('<tipoIdentificacionComprador>04</tipoIdentificacionComprador>');
    expect(xml).toContain('<razonSocialComprador>COMPRADOR TEST</razonSocialComprador>');
    expect(xml).toContain('<totalSinImpuestos>100.00</totalSinImpuestos>');
    expect(xml).toContain('<totalDescuento>0.00</totalDescuento>');
    expect(xml).toContain('<importeTotal>115.00</importeTotal>');
    expect(xml).toContain('<moneda>DOLAR</moneda>');
  });

  it('should include totalConImpuestos', () => {
    const xml = gen.generate(baseData);
    expect(xml).toContain('<totalConImpuestos>');
    expect(xml).toContain('<totalImpuesto>');
    expect(xml).toContain('<codigo>2</codigo>');
    expect(xml).toContain('<codigoPorcentaje>4</codigoPorcentaje>');
    expect(xml).toContain('<baseImponible>100.00</baseImponible>');
    expect(xml).toContain('<valor>15.00</valor>');
  });

  it('should include pagos', () => {
    const xml = gen.generate(baseData);
    expect(xml).toContain('<pagos>');
    expect(xml).toContain('<pago>');
    expect(xml).toContain('<formaPago>01</formaPago>');
    expect(xml).toContain('<total>115.00</total>');
  });

  it('should include detalles with impuestos', () => {
    const xml = gen.generate(baseData);
    expect(xml).toContain('<detalles>');
    expect(xml).toContain('<detalle>');
    expect(xml).toContain('<codigoPrincipal>PROD001</codigoPrincipal>');
    expect(xml).toContain('<descripcion>Producto test</descripcion>');
    expect(xml).toContain('<cantidad>1.000000</cantidad>');
    expect(xml).toContain('<precioUnitario>100.000000</precioUnitario>');
    expect(xml).toContain('<tarifa>15.00</tarifa>');
  });

  it('should include optional nombreComercial', () => {
    const xml = gen.generate({ ...baseData, nombreComercial: 'MI TIENDA' });
    expect(xml).toContain('<nombreComercial>MI TIENDA</nombreComercial>');
  });

  it('should omit nombreComercial when not provided', () => {
    const xml = gen.generate(baseData);
    expect(xml).not.toContain('<nombreComercial>');
  });

  it('should include contribuyenteRimpe when set', () => {
    const xml = gen.generate({ ...baseData, contribuyenteRimpe: 'CONTRIBUYENTE REGIMEN GENERAL' });
    expect(xml).toContain('<contribuyenteRimpe>CONTRIBUYENTE REGIMEN GENERAL</contribuyenteRimpe>');
  });

  it('should include infoAdicional when provided', () => {
    const xml = gen.generate({
      ...baseData,
      infoAdicional: [
        { nombre: 'Email', valor: 'test@test.com' },
        { nombre: 'Telefono', valor: '04-2345678' },
      ],
    });
    expect(xml).toContain('<infoAdicional>');
    expect(xml).toContain('nombre="Email"');
    expect(xml).toContain('test@test.com');
  });

  it('should omit infoAdicional when empty', () => {
    const xml = gen.generate({ ...baseData, infoAdicional: [] });
    expect(xml).not.toContain('<infoAdicional>');
  });

  it('should include direccionComprador when provided', () => {
    const xml = gen.generate({ ...baseData, direccionComprador: 'Av. Principal 123' });
    expect(xml).toContain('<direccionComprador>Av. Principal 123</direccionComprador>');
  });

  it('should include guiaRemision when provided', () => {
    const xml = gen.generate({ ...baseData, guiaRemision: '001-001-000000001' });
    expect(xml).toContain('<guiaRemision>001-001-000000001</guiaRemision>');
  });

  it('should handle reembolso factura', () => {
    const xml = gen.generate({
      ...baseData,
      reembolsos: [{
        tipoIdentificacionProveedorReembolso: '04',
        identificacionProveedorReembolso: '0992191813001',
        codPaisProveedorReembolso: '593',
        tipoProveedorReembolso: '02',
        codDocReembolso: '01',
        estabDocReembolso: '001',
        ptoEmiDocReembolso: '001',
        secuencialDocReembolso: '000000001',
        fechaEmisionDocReembolso: '01/03/2026',
        numeroautorizacionDocReemb: '0603202601099219181300110010010000000011234567813',
        detalleImpuestos: [{
          codigo: '2', codigoPorcentaje: '4', tarifa: 15,
          baseImponibleReembolso: 100, impuestoReembolso: 15,
        }],
      }],
    });
    expect(xml).toContain('<reembolsos>');
    expect(xml).toContain('<reembolsoDetalle>');
    expect(xml).toContain('<codDocReembolso>01</codDocReembolso>');
  });

  it('should include multiple detalles', () => {
    const data = {
      ...baseData,
      detalles: [
        { ...baseData.detalles[0] },
        {
          codigoPrincipal: 'PROD002',
          descripcion: 'Segundo producto',
          cantidad: 2,
          precioUnitario: 50,
          descuento: 5,
          precioTotalSinImpuesto: 95,
          impuestos: [
            { codigo: '2', codigoPorcentaje: '0', tarifa: 0, baseImponible: 95, valor: 0 },
          ],
        },
      ],
    };
    const xml = gen.generate(data);
    expect(xml).toContain('PROD001');
    expect(xml).toContain('PROD002');
    expect(xml).toContain('Segundo producto');
  });

  it('should include detallesAdicionales on line items', () => {
    const data = {
      ...baseData,
      detalles: [{
        ...baseData.detalles[0],
        detallesAdicionales: [
          { nombre: 'Color', valor: 'Rojo' },
        ],
      }],
    };
    const xml = gen.generate(data);
    expect(xml).toContain('<detallesAdicionales>');
    expect(xml).toContain('nombre="Color"');
    expect(xml).toContain('valor="Rojo"');
  });

  it('should produce valid XML structure (starts with declaration)', () => {
    const xml = gen.generate(baseData);
    expect(xml).toMatch(/^<\?xml version="1\.0" encoding="UTF-8"\?>/);
  });
});
