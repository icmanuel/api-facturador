import { NotaDebitoGenerator } from './nota-debito.generator';

describe('NotaDebitoGenerator', () => {
  const gen = new NotaDebitoGenerator();

  const baseData = {
    ambiente: '1',
    razonSocial: 'EMPRESA TEST S.A.',
    ruc: '0992191813001',
    claveAcceso: '0603202605099219181300110010010000000031234567813',
    establecimiento: '001',
    puntoEmision: '001',
    secuencial: '000000003',
    dirMatriz: 'Guayaquil, Ecuador',
    fechaEmision: '06/03/2026',
    tipoIdentificacionComprador: '04',
    razonSocialComprador: 'COMPRADOR TEST S.A.',
    identificacionComprador: '0706410164001',
    obligadoContabilidad: 'SI',
    codDocModificado: '01',
    numDocModificado: '001-001-000000001',
    fechaEmisionDocSustento: '05/03/2026',
    totalSinImpuestos: 20,
    totalConImpuestos: [
      { codigo: '2', codigoPorcentaje: '4', baseImponible: 20, tarifa: 15, valor: 3 },
    ],
    valorTotal: 23,
    motivos: [
      { razon: 'Interes por mora', valor: 20 },
    ],
  };

  it('should generate valid notaDebito XML', () => {
    const xml = gen.generate(baseData);
    expect(xml).toContain('<notaDebito');
    expect(xml).toContain('version="1.0.0"');
    expect(xml).toContain('<codDoc>05</codDoc>');
  });

  it('should start with XML declaration', () => {
    const xml = gen.generate(baseData);
    expect(xml).toMatch(/^<\?xml version="1\.0" encoding="UTF-8"\?>/);
  });

  it('should include infoTributaria', () => {
    const xml = gen.generate(baseData);
    expect(xml).toContain('<ambiente>1</ambiente>');
    expect(xml).toContain('<tipoEmision>1</tipoEmision>');
    expect(xml).toContain('<razonSocial>EMPRESA TEST S.A.</razonSocial>');
    expect(xml).toContain(`<ruc>${baseData.ruc}</ruc>`);
    expect(xml).toContain(`<claveAcceso>${baseData.claveAcceso}</claveAcceso>`);
    expect(xml).toContain('<estab>001</estab>');
    expect(xml).toContain('<ptoEmi>001</ptoEmi>');
    expect(xml).toContain('<secuencial>000000003</secuencial>');
    expect(xml).toContain('<dirMatriz>Guayaquil, Ecuador</dirMatriz>');
  });

  it('should include infoNotaDebito', () => {
    const xml = gen.generate(baseData);
    expect(xml).toContain('<infoNotaDebito>');
    expect(xml).toContain('<fechaEmision>06/03/2026</fechaEmision>');
    expect(xml).toContain('<tipoIdentificacionComprador>04</tipoIdentificacionComprador>');
    expect(xml).toContain('<razonSocialComprador>COMPRADOR TEST S.A.</razonSocialComprador>');
    expect(xml).toContain('<identificacionComprador>0706410164001</identificacionComprador>');
    expect(xml).toContain('<obligadoContabilidad>SI</obligadoContabilidad>');
    expect(xml).toContain('<codDocModificado>01</codDocModificado>');
    expect(xml).toContain('<numDocModificado>001-001-000000001</numDocModificado>');
    expect(xml).toContain('<fechaEmisionDocSustento>05/03/2026</fechaEmisionDocSustento>');
    expect(xml).toContain('<totalSinImpuestos>20.00</totalSinImpuestos>');
    expect(xml).toContain('<valorTotal>23.00</valorTotal>');
  });

  it('should include impuestos with tarifa', () => {
    const xml = gen.generate(baseData);
    expect(xml).toContain('<impuestos>');
    expect(xml).toContain('<impuesto>');
    expect(xml).toContain('<codigo>2</codigo>');
    expect(xml).toContain('<codigoPorcentaje>4</codigoPorcentaje>');
    expect(xml).toContain('<baseImponible>20.00</baseImponible>');
    expect(xml).toContain('<tarifa>15.00</tarifa>');
    expect(xml).toContain('<valor>3.00</valor>');
  });

  it('should include motivos', () => {
    const xml = gen.generate(baseData);
    expect(xml).toContain('<motivos>');
    expect(xml).toContain('<motivo>');
    expect(xml).toContain('<razon>Interes por mora</razon>');
    expect(xml).toContain('<valor>20.00</valor>');
  });

  it('should include multiple motivos', () => {
    const data = {
      ...baseData,
      motivos: [
        { razon: 'Interes por mora', valor: 15 },
        { razon: 'Gasto administrativo', valor: 5 },
      ],
    };
    const xml = gen.generate(data);
    expect(xml).toContain('Interes por mora');
    expect(xml).toContain('Gasto administrativo');
    expect(xml).toContain('<valor>15.00</valor>');
    expect(xml).toContain('<valor>5.00</valor>');
  });

  it('should include pagos when provided', () => {
    const data = {
      ...baseData,
      pagos: [
        { formaPago: '01', total: 23, plazo: 30, unidadTiempo: 'dias' },
      ],
    };
    const xml = gen.generate(data);
    expect(xml).toContain('<pagos>');
    expect(xml).toContain('<pago>');
    expect(xml).toContain('<formaPago>01</formaPago>');
    expect(xml).toContain('<total>23.00</total>');
    expect(xml).toContain('<plazo>30</plazo>');
    expect(xml).toContain('<unidadTiempo>dias</unidadTiempo>');
  });

  it('should omit pagos when not provided', () => {
    const xml = gen.generate(baseData);
    expect(xml).not.toContain('<pagos>');
  });

  it('should include optional dirEstablecimiento', () => {
    const xml = gen.generate({ ...baseData, dirEstablecimiento: 'Sucursal Este' });
    expect(xml).toContain('<dirEstablecimiento>Sucursal Este</dirEstablecimiento>');
  });

  it('should include optional contribuyenteEspecial', () => {
    const xml = gen.generate({ ...baseData, contribuyenteEspecial: '9999' });
    expect(xml).toContain('<contribuyenteEspecial>9999</contribuyenteEspecial>');
  });

  it('should include optional rise', () => {
    const xml = gen.generate({ ...baseData, rise: 'Contribuyente RISE' });
    expect(xml).toContain('<rise>Contribuyente RISE</rise>');
  });

  it('should include nombreComercial when set', () => {
    const xml = gen.generate({ ...baseData, nombreComercial: 'MI TIENDA' });
    expect(xml).toContain('<nombreComercial>MI TIENDA</nombreComercial>');
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

  it('should include infoAdicional', () => {
    const xml = gen.generate({
      ...baseData,
      infoAdicional: [{ nombre: 'Email', valor: 'test@test.com' }],
    });
    expect(xml).toContain('<infoAdicional>');
    expect(xml).toContain('nombre="Email"');
    expect(xml).toContain('test@test.com');
  });

  it('should omit infoAdicional when not provided', () => {
    const xml = gen.generate(baseData);
    expect(xml).not.toContain('<infoAdicional>');
  });
});
