import { RetencionGenerator } from './retencion.generator';

describe('RetencionGenerator', () => {
  const gen = new RetencionGenerator();

  const baseData = {
    ambiente: '1',
    razonSocial: 'EMPRESA RETENEDORA S.A.',
    ruc: '0992191813001',
    claveAcceso: '0603202607099219181300110010010000000011234567813',
    establecimiento: '001',
    puntoEmision: '001',
    secuencial: '000000001',
    dirMatriz: 'Guayaquil, Ecuador',
    fechaEmision: '06/03/2026',
    obligadoContabilidad: 'SI',
    tipoIdentificacionSujetoRetenido: '04',
    razonSocialSujetoRetenido: 'PROVEEDOR TEST S.A.',
    identificacionSujetoRetenido: '0706410164001',
    periodoFiscal: '03/2026',
    parteRel: 'NO',
    docsSustento: [
      {
        codSustento: '01',
        codDocSustento: '01',
        numDocSustento: '001-001-000000042',
        fechaEmisionDocSustento: '05/03/2026',
        fechaRegistroContable: '05/03/2026',
        numAutDocSustento: '0503202601099219181300110010010000000421234567811',
        pagoLocExt: '01',
        totalSinImpuestos: 887.50,
        importeTotal: 1020.63,
        impuestosDocSustento: [
          {
            codImpuestoDocSustento: '2',
            codigoPorcentaje: '4',
            baseImponible: 887.50,
            tarifa: 15,
            valorImpuesto: 133.13,
          },
        ],
        retenciones: [
          {
            codigo: '1',
            codigoRetencion: '312',
            baseImponible: 887.50,
            porcentajeRetener: 1,
            valorRetenido: 8.88,
          },
          {
            codigo: '2',
            codigoRetencion: '1',
            baseImponible: 133.13,
            porcentajeRetener: 30,
            valorRetenido: 39.94,
          },
        ],
        pagos: [
          { formaPago: '01', total: 1020.63 },
        ],
      },
    ],
  };

  it('should generate valid v2.0.0 retencion XML', () => {
    const xml = gen.generate(baseData);
    expect(xml).toContain('<comprobanteRetencion');
    expect(xml).toContain('version="2.0.0"');
    expect(xml).toContain('<codDoc>07</codDoc>');
  });

  it('should start with XML declaration', () => {
    const xml = gen.generate(baseData);
    expect(xml).toMatch(/^<\?xml version="1\.0" encoding="UTF-8"\?>/);
  });

  it('should include infoTributaria', () => {
    const xml = gen.generate(baseData);
    expect(xml).toContain('<ambiente>1</ambiente>');
    expect(xml).toContain('<tipoEmision>1</tipoEmision>');
    expect(xml).toContain('<razonSocial>EMPRESA RETENEDORA S.A.</razonSocial>');
    expect(xml).toContain(`<ruc>${baseData.ruc}</ruc>`);
    expect(xml).toContain(`<claveAcceso>${baseData.claveAcceso}</claveAcceso>`);
    expect(xml).toContain('<estab>001</estab>');
    expect(xml).toContain('<ptoEmi>001</ptoEmi>');
    expect(xml).toContain('<secuencial>000000001</secuencial>');
    expect(xml).toContain('<dirMatriz>Guayaquil, Ecuador</dirMatriz>');
  });

  it('should include infoCompRetencion with v2.0.0 fields', () => {
    const xml = gen.generate(baseData);
    expect(xml).toContain('<infoCompRetencion>');
    expect(xml).toContain('<fechaEmision>06/03/2026</fechaEmision>');
    expect(xml).toContain('<obligadoContabilidad>SI</obligadoContabilidad>');
    expect(xml).toContain('<tipoIdentificacionSujetoRetenido>04</tipoIdentificacionSujetoRetenido>');
    expect(xml).toContain('<parteRel>NO</parteRel>');
    expect(xml).toContain('<razonSocialSujetoRetenido>PROVEEDOR TEST S.A.</razonSocialSujetoRetenido>');
    expect(xml).toContain('<identificacionSujetoRetenido>0706410164001</identificacionSujetoRetenido>');
    expect(xml).toContain('<periodoFiscal>03/2026</periodoFiscal>');
  });

  it('should include tipoSujetoRetenido when provided', () => {
    const xml = gen.generate({ ...baseData, tipoSujetoRetenido: '02' });
    expect(xml).toContain('<tipoSujetoRetenido>02</tipoSujetoRetenido>');
  });

  it('should include docsSustento structure', () => {
    const xml = gen.generate(baseData);
    expect(xml).toContain('<docsSustento>');
    expect(xml).toContain('<docSustento>');
    expect(xml).toContain('<codSustento>01</codSustento>');
    expect(xml).toContain('<codDocSustento>01</codDocSustento>');
    expect(xml).toContain('<numDocSustento>001001000000042</numDocSustento>');
    expect(xml).toContain('<fechaEmisionDocSustento>05/03/2026</fechaEmisionDocSustento>');
    expect(xml).toContain('<fechaRegistroContable>05/03/2026</fechaRegistroContable>');
    expect(xml).toContain('<pagoLocExt>01</pagoLocExt>');
    expect(xml).toContain('<totalSinImpuestos>887.50</totalSinImpuestos>');
    expect(xml).toContain('<importeTotal>1020.63</importeTotal>');
  });

  it('should include numAutDocSustento when provided', () => {
    const xml = gen.generate(baseData);
    expect(xml).toContain('<numAutDocSustento>');
  });

  it('should omit numAutDocSustento when not provided', () => {
    const data = {
      ...baseData,
      docsSustento: [{
        ...baseData.docsSustento[0],
        numAutDocSustento: undefined,
      }],
    };
    const xml = gen.generate(data);
    expect(xml).not.toContain('<numAutDocSustento>');
  });

  it('should include impuestosDocSustento', () => {
    const xml = gen.generate(baseData);
    expect(xml).toContain('<impuestosDocSustento>');
    expect(xml).toContain('<impuestoDocSustento>');
    expect(xml).toContain('<codImpuestoDocSustento>2</codImpuestoDocSustento>');
    expect(xml).toContain('<codigoPorcentaje>4</codigoPorcentaje>');
    expect(xml).toContain('<baseImponible>887.50</baseImponible>');
    expect(xml).toContain('<tarifa>15.00</tarifa>');
    expect(xml).toContain('<valorImpuesto>133.13</valorImpuesto>');
  });

  it('should include retenciones within docSustento', () => {
    const xml = gen.generate(baseData);
    expect(xml).toContain('<retenciones>');
    expect(xml).toContain('<retencion>');
    expect(xml).toContain('<codigo>1</codigo>');
    expect(xml).toContain('<codigoRetencion>312</codigoRetencion>');
    expect(xml).toContain('<porcentajeRetener>1.00</porcentajeRetener>');
    expect(xml).toContain('<valorRetenido>8.88</valorRetenido>');
    expect(xml).toContain('<codigo>2</codigo>');
    expect(xml).toContain('<codigoRetencion>1</codigoRetencion>');
    expect(xml).toContain('<valorRetenido>39.94</valorRetenido>');
  });

  it('should include pagos within docSustento', () => {
    const xml = gen.generate(baseData);
    expect(xml).toContain('<pagos>');
    expect(xml).toContain('<pago>');
    expect(xml).toContain('<formaPago>01</formaPago>');
    expect(xml).toContain('<total>1020.63</total>');
  });

  it('should default pagos to formaPago 20 with importeTotal when not provided', () => {
    const data = {
      ...baseData,
      docsSustento: [{
        ...baseData.docsSustento[0],
        pagos: undefined,
      }],
    };
    const xml = gen.generate(data);
    expect(xml).toContain('<pagos>');
    expect(xml).toContain('<formaPago>20</formaPago>');
    expect(xml).toContain('<total>1020.63</total>');
  });

  it('should handle multiple docsSustento', () => {
    const data = {
      ...baseData,
      docsSustento: [
        baseData.docsSustento[0],
        {
          codSustento: '01',
          codDocSustento: '01',
          numDocSustento: '002-001-000000055',
          fechaEmisionDocSustento: '03/03/2026',
          pagoLocExt: '01',
          totalSinImpuestos: 2000,
          importeTotal: 2300,
          impuestosDocSustento: [
            { codImpuestoDocSustento: '2', codigoPorcentaje: '4', baseImponible: 2000, tarifa: 15, valorImpuesto: 300 },
          ],
          retenciones: [
            { codigo: '1', codigoRetencion: '303', baseImponible: 2000, porcentajeRetener: 10, valorRetenido: 200 },
          ],
        },
      ],
    };
    const xml = gen.generate(data);
    expect(xml).toContain('001001000000042');
    expect(xml).toContain('002001000000055');
    expect(xml).toContain('<codigoRetencion>312</codigoRetencion>');
    expect(xml).toContain('<codigoRetencion>303</codigoRetencion>');
  });

  it('should default fechaRegistroContable to fechaEmisionDocSustento', () => {
    const data = {
      ...baseData,
      docsSustento: [{
        ...baseData.docsSustento[0],
        fechaRegistroContable: undefined,
      }],
    };
    const xml = gen.generate(data);
    expect(xml).toContain('<fechaRegistroContable>05/03/2026</fechaRegistroContable>');
  });

  it('should default pagoLocExt to 01', () => {
    const data = {
      ...baseData,
      docsSustento: [{
        ...baseData.docsSustento[0],
        pagoLocExt: undefined,
      }],
    };
    const xml = gen.generate(data);
    expect(xml).toContain('<pagoLocExt>01</pagoLocExt>');
  });

  it('should default parteRel to NO', () => {
    const { parteRel, ...rest } = baseData;
    const xml = gen.generate(rest as any);
    expect(xml).toContain('<parteRel>NO</parteRel>');
  });

  it('should include optional dirEstablecimiento', () => {
    const xml = gen.generate({ ...baseData, dirEstablecimiento: 'Sucursal Norte' });
    expect(xml).toContain('<dirEstablecimiento>Sucursal Norte</dirEstablecimiento>');
  });

  it('should include contribuyenteEspecial', () => {
    const xml = gen.generate({ ...baseData, contribuyenteEspecial: '12345' });
    expect(xml).toContain('<contribuyenteEspecial>12345</contribuyenteEspecial>');
  });

  it('should include infoAdicional', () => {
    const xml = gen.generate({
      ...baseData,
      infoAdicional: [{ nombre: 'Email', valor: 'proveedor@email.com' }],
    });
    expect(xml).toContain('<infoAdicional>');
    expect(xml).toContain('nombre="Email"');
    expect(xml).toContain('proveedor@email.com');
  });

  it('should omit infoAdicional when not provided', () => {
    const xml = gen.generate(baseData);
    expect(xml).not.toContain('<infoAdicional>');
  });

  it('should include agenteRetencion when set', () => {
    const xml = gen.generate({ ...baseData, agenteRetencion: '1' });
    expect(xml).toContain('<agenteRetencion>1</agenteRetencion>');
  });

  it('should include contribuyenteRimpe when set', () => {
    const xml = gen.generate({ ...baseData, contribuyenteRimpe: 'CONTRIBUYENTE REGIMEN GENERAL' });
    expect(xml).toContain('<contribuyenteRimpe>CONTRIBUYENTE REGIMEN GENERAL</contribuyenteRimpe>');
  });

  it('should include regimenMicroempresas when set', () => {
    const xml = gen.generate({ ...baseData, regimenMicroempresas: true });
    expect(xml).toContain('<regimenMicroempresas>CONTRIBUYENTE RÉGIMEN MICROEMPRESAS</regimenMicroempresas>');
  });

  it('should default obligadoContabilidad to NO', () => {
    const { obligadoContabilidad, ...rest } = baseData;
    const xml = gen.generate(rest as any);
    expect(xml).toContain('<obligadoContabilidad>NO</obligadoContabilidad>');
  });

  it('should NOT contain flat impuestos section (v1.0.0 structure)', () => {
    const xml = gen.generate(baseData);
    expect(xml).not.toMatch(/<\/infoCompRetencion>\s*<impuestos>/);
  });
});
