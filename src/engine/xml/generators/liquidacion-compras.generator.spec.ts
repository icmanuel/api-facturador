import { LiquidacionComprasGenerator } from './liquidacion-compras.generator';

describe('LiquidacionComprasGenerator', () => {
  const gen = new LiquidacionComprasGenerator();

  const baseData = {
    ambiente: '1',
    razonSocial: 'EMPRESA COMPRADORA S.A.',
    ruc: '0992191813001',
    claveAcceso: '0603202603099219181300110010010000000051234567813',
    establecimiento: '001',
    puntoEmision: '001',
    secuencial: '000000005',
    dirMatriz: 'Guayaquil, Ecuador',
    fechaEmision: '06/03/2026',
    obligadoContabilidad: 'SI',
    tipoIdentificacionProveedor: '05',
    razonSocialProveedor: 'PEREZ GARCIA JUAN CARLOS',
    identificacionProveedor: '0706410164',
    totalSinImpuestos: 500,
    totalDescuento: 0,
    totalConImpuestos: [
      { codigo: '2', codigoPorcentaje: '0', baseImponible: 500, valor: 0 },
    ],
    importeTotal: 500,
    pagos: [{ formaPago: '01', total: 500 }],
    detalles: [
      {
        codigoPrincipal: 'CACAO-001',
        descripcion: 'CACAO EN GRANO SECO - QUINTAL 45KG',
        cantidad: 10,
        precioUnitario: 50,
        descuento: 0,
        precioTotalSinImpuesto: 500,
        impuestos: [
          { codigo: '2', codigoPorcentaje: '0', tarifa: 0, baseImponible: 500, valor: 0 },
        ],
      },
    ],
  };

  it('should generate valid liquidacionCompra XML', () => {
    const xml = gen.generate(baseData);
    expect(xml).toContain('<liquidacionCompra');
    expect(xml).toContain('version="1.1.0"');
    expect(xml).toContain('<codDoc>03</codDoc>');
  });

  it('should start with XML declaration', () => {
    const xml = gen.generate(baseData);
    expect(xml).toMatch(/^<\?xml version="1\.0" encoding="UTF-8"\?>/);
  });

  it('should include infoTributaria', () => {
    const xml = gen.generate(baseData);
    expect(xml).toContain('<ambiente>1</ambiente>');
    expect(xml).toContain('<tipoEmision>1</tipoEmision>');
    expect(xml).toContain('<razonSocial>EMPRESA COMPRADORA S.A.</razonSocial>');
    expect(xml).toContain(`<ruc>${baseData.ruc}</ruc>`);
    expect(xml).toContain(`<claveAcceso>${baseData.claveAcceso}</claveAcceso>`);
    expect(xml).toContain('<estab>001</estab>');
    expect(xml).toContain('<ptoEmi>001</ptoEmi>');
    expect(xml).toContain('<secuencial>000000005</secuencial>');
    expect(xml).toContain('<dirMatriz>Guayaquil, Ecuador</dirMatriz>');
  });

  it('should include infoLiquidacionCompra', () => {
    const xml = gen.generate(baseData);
    expect(xml).toContain('<infoLiquidacionCompra>');
    expect(xml).toContain('<fechaEmision>06/03/2026</fechaEmision>');
    expect(xml).toContain('<obligadoContabilidad>SI</obligadoContabilidad>');
    expect(xml).toContain('<tipoIdentificacionProveedor>05</tipoIdentificacionProveedor>');
    expect(xml).toContain('<razonSocialProveedor>PEREZ GARCIA JUAN CARLOS</razonSocialProveedor>');
    expect(xml).toContain('<identificacionProveedor>0706410164</identificacionProveedor>');
    expect(xml).toContain('<totalSinImpuestos>500.00</totalSinImpuestos>');
    expect(xml).toContain('<totalDescuento>0.00</totalDescuento>');
    expect(xml).toContain('<importeTotal>500.00</importeTotal>');
    expect(xml).toContain('<moneda>DOLAR</moneda>');
  });

  it('should include totalConImpuestos', () => {
    const xml = gen.generate(baseData);
    expect(xml).toContain('<totalConImpuestos>');
    expect(xml).toContain('<totalImpuesto>');
    expect(xml).toContain('<codigo>2</codigo>');
    expect(xml).toContain('<codigoPorcentaje>0</codigoPorcentaje>');
    expect(xml).toContain('<baseImponible>500.00</baseImponible>');
    expect(xml).toContain('<valor>0.00</valor>');
  });

  it('should include pagos', () => {
    const xml = gen.generate(baseData);
    expect(xml).toContain('<pagos>');
    expect(xml).toContain('<pago>');
    expect(xml).toContain('<formaPago>01</formaPago>');
    expect(xml).toContain('<total>500.00</total>');
  });

  it('should include pagos with plazo and unidadTiempo', () => {
    const data = {
      ...baseData,
      pagos: [{ formaPago: '20', total: 500, plazo: 30, unidadTiempo: 'dias' }],
    };
    const xml = gen.generate(data);
    expect(xml).toContain('<plazo>30</plazo>');
    expect(xml).toContain('<unidadTiempo>dias</unidadTiempo>');
  });

  it('should include detalles', () => {
    const xml = gen.generate(baseData);
    expect(xml).toContain('<detalles>');
    expect(xml).toContain('<detalle>');
    expect(xml).toContain('<codigoPrincipal>CACAO-001</codigoPrincipal>');
    expect(xml).toContain('<descripcion>CACAO EN GRANO SECO - QUINTAL 45KG</descripcion>');
    expect(xml).toContain('<cantidad>10.000000</cantidad>');
    expect(xml).toContain('<precioUnitario>50.000000</precioUnitario>');
    expect(xml).toContain('<descuento>0.00</descuento>');
    expect(xml).toContain('<precioTotalSinImpuesto>500.00</precioTotalSinImpuesto>');
  });

  it('should include optional dirEstablecimiento', () => {
    const xml = gen.generate({ ...baseData, dirEstablecimiento: 'Sucursal Norte' });
    expect(xml).toContain('<dirEstablecimiento>Sucursal Norte</dirEstablecimiento>');
  });

  it('should include optional contribuyenteEspecial', () => {
    const xml = gen.generate({ ...baseData, contribuyenteEspecial: '5678' });
    expect(xml).toContain('<contribuyenteEspecial>5678</contribuyenteEspecial>');
  });

  it('should include optional direccionProveedor', () => {
    const xml = gen.generate({ ...baseData, direccionProveedor: 'Recinto El Progreso' });
    expect(xml).toContain('<direccionProveedor>Recinto El Progreso</direccionProveedor>');
  });

  it('should include nombreComercial when set', () => {
    const xml = gen.generate({ ...baseData, nombreComercial: 'MI EMPRESA' });
    expect(xml).toContain('<nombreComercial>MI EMPRESA</nombreComercial>');
  });

  it('should include contribuyenteRimpe when set', () => {
    const xml = gen.generate({ ...baseData, contribuyenteRimpe: 'CONTRIBUYENTE REGIMEN GENERAL' });
    expect(xml).toContain('<contribuyenteRimpe>CONTRIBUYENTE REGIMEN GENERAL</contribuyenteRimpe>');
  });

  it('should include regimenMicroempresas when set', () => {
    const xml = gen.generate({ ...baseData, regimenMicroempresas: true });
    expect(xml).toContain('<regimenMicroempresas>CONTRIBUYENTE RÉGIMEN MICROEMPRESAS</regimenMicroempresas>');
  });

  it('should include agenteRetencion when set', () => {
    const xml = gen.generate({ ...baseData, agenteRetencion: '1' });
    expect(xml).toContain('<agenteRetencion>1</agenteRetencion>');
  });

  it('should default obligadoContabilidad to NO', () => {
    const { obligadoContabilidad, ...rest } = baseData;
    const xml = gen.generate(rest as any);
    expect(xml).toContain('<obligadoContabilidad>NO</obligadoContabilidad>');
  });

  it('should default moneda to DOLAR', () => {
    const xml = gen.generate(baseData);
    expect(xml).toContain('<moneda>DOLAR</moneda>');
  });

  it('should allow custom moneda', () => {
    const xml = gen.generate({ ...baseData, moneda: 'EURO' });
    expect(xml).toContain('<moneda>EURO</moneda>');
  });

  it('should include descuentoAdicional in totalConImpuestos when set', () => {
    const data = {
      ...baseData,
      totalConImpuestos: [
        { codigo: '2', codigoPorcentaje: '0', baseImponible: 500, valor: 0, descuentoAdicional: 10 },
      ],
    };
    const xml = gen.generate(data);
    expect(xml).toContain('<descuentoAdicional>10.00</descuentoAdicional>');
  });

  it('should include codigoAuxiliar on detalle', () => {
    const data = {
      ...baseData,
      detalles: [{
        ...baseData.detalles[0],
        codigoAuxiliar: 'AUX-CACAO',
      }],
    };
    const xml = gen.generate(data);
    expect(xml).toContain('<codigoAuxiliar>AUX-CACAO</codigoAuxiliar>');
  });

  it('should include detallesAdicionales on line items', () => {
    const data = {
      ...baseData,
      detalles: [{
        ...baseData.detalles[0],
        detallesAdicionales: [{ nombre: 'Origen', valor: 'Guayas' }],
      }],
    };
    const xml = gen.generate(data);
    expect(xml).toContain('<detallesAdicionales>');
    expect(xml).toContain('nombre="Origen"');
    expect(xml).toContain('valor="Guayas"');
  });

  it('should include infoAdicional', () => {
    const xml = gen.generate({
      ...baseData,
      infoAdicional: [{ nombre: 'Email', valor: 'compras@empresa.com' }],
    });
    expect(xml).toContain('<infoAdicional>');
    expect(xml).toContain('nombre="Email"');
    expect(xml).toContain('compras@empresa.com');
  });

  it('should omit infoAdicional when not provided', () => {
    const xml = gen.generate(baseData);
    expect(xml).not.toContain('<infoAdicional>');
  });

  it('should include reembolsos when provided', () => {
    const data = {
      ...baseData,
      reembolsos: [{
        tipoIdentificacionProveedorReembolso: '05',
        identificacionProveedorReembolso: '0706410164',
        codPaisProveedorReembolso: '593',
        tipoProveedorReembolso: '02',
        codDocReembolso: '01',
        estabDocReembolso: '001',
        ptoEmiDocReembolso: '001',
        secuencialDocReembolso: '000000001',
        fechaEmisionDocReembolso: '01/03/2026',
        numeroautorizacionDocReemb: '0603202601099219181300110010010000000011234567813',
        detalleImpuestos: [{
          codigo: '2',
          codigoPorcentaje: '0',
          tarifa: 0,
          baseImponibleReembolso: 500,
          impuestoReembolso: 0,
        }],
      }],
    };
    const xml = gen.generate(data);
    expect(xml).toContain('<reembolsos>');
    expect(xml).toContain('<reembolsoDetalle>');
    expect(xml).toContain('<codDocReembolso>01</codDocReembolso>');
    expect(xml).toContain('<baseImponibleReembolso>500.00</baseImponibleReembolso>');
    expect(xml).toContain('<impuestoReembolso>0.00</impuestoReembolso>');
  });

  it('should omit reembolsos when not provided', () => {
    const xml = gen.generate(baseData);
    expect(xml).not.toContain('<reembolsos>');
  });

  it('should handle multiple detalles', () => {
    const data = {
      ...baseData,
      detalles: [
        baseData.detalles[0],
        {
          codigoPrincipal: 'CAFE-001',
          descripcion: 'CAFE EN GRANO',
          cantidad: 5,
          precioUnitario: 80,
          descuento: 0,
          precioTotalSinImpuesto: 400,
          impuestos: [
            { codigo: '2', codigoPorcentaje: '0', tarifa: 0, baseImponible: 400, valor: 0 },
          ],
        },
      ],
    };
    const xml = gen.generate(data);
    expect(xml).toContain('CACAO-001');
    expect(xml).toContain('CAFE-001');
    expect(xml).toContain('CAFE EN GRANO');
  });
});
