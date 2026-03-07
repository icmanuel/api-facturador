import { GuiaRemisionGenerator } from './guia-remision.generator';

describe('GuiaRemisionGenerator', () => {
  const gen = new GuiaRemisionGenerator();

  const baseData = {
    ambiente: '1',
    razonSocial: 'EMPRESA TRANSPORTES S.A.',
    ruc: '0992191813001',
    claveAcceso: '0603202606099219181300110010010000000041234567813',
    establecimiento: '001',
    puntoEmision: '001',
    secuencial: '000000004',
    dirMatriz: 'Guayaquil, Ecuador',
    dirPartida: 'Bodega Principal - Km 15 Via Daule',
    razonSocialTransportista: 'TRANSPORTES GARCIA CIA. LTDA.',
    tipoIdentificacionTransportista: '04',
    rucTransportista: '0991234567001',
    obligadoContabilidad: 'SI',
    fechaIniTransporte: '06/03/2026',
    fechaFinTransporte: '07/03/2026',
    placa: 'GYE-1234',
    destinatarios: [
      {
        identificacionDestinatario: '0706410164001',
        razonSocialDestinatario: 'CLIENTE QUITO S.A.',
        dirDestinatario: 'Av. Amazonas N36-152, Quito',
        motivoTraslado: 'Venta de mercaderia',
        codDocSustento: '01',
        numDocSustento: '001-001-000000010',
        fechaEmisionDocSustento: '05/03/2026',
        detalles: [
          {
            codigoInterno: 'PROD001',
            descripcion: 'Producto A - Caja x12',
            cantidad: 50,
          },
          {
            codigoInterno: 'PROD002',
            descripcion: 'Producto B - Paquete x6',
            cantidad: 30,
          },
        ],
      },
    ],
  };

  it('should generate valid guiaRemision XML', () => {
    const xml = gen.generate(baseData);
    expect(xml).toContain('<guiaRemision');
    expect(xml).toContain('version="1.1.0"');
    expect(xml).toContain('<codDoc>06</codDoc>');
  });

  it('should start with XML declaration', () => {
    const xml = gen.generate(baseData);
    expect(xml).toMatch(/^<\?xml version="1\.0" encoding="UTF-8"\?>/);
  });

  it('should include infoTributaria', () => {
    const xml = gen.generate(baseData);
    expect(xml).toContain('<ambiente>1</ambiente>');
    expect(xml).toContain('<tipoEmision>1</tipoEmision>');
    expect(xml).toContain('<razonSocial>EMPRESA TRANSPORTES S.A.</razonSocial>');
    expect(xml).toContain(`<ruc>${baseData.ruc}</ruc>`);
    expect(xml).toContain(`<claveAcceso>${baseData.claveAcceso}</claveAcceso>`);
    expect(xml).toContain('<estab>001</estab>');
    expect(xml).toContain('<ptoEmi>001</ptoEmi>');
    expect(xml).toContain('<secuencial>000000004</secuencial>');
    expect(xml).toContain('<dirMatriz>Guayaquil, Ecuador</dirMatriz>');
  });

  it('should include infoGuiaRemision', () => {
    const xml = gen.generate(baseData);
    expect(xml).toContain('<infoGuiaRemision>');
    expect(xml).toContain('<dirPartida>Bodega Principal - Km 15 Via Daule</dirPartida>');
    expect(xml).toContain('<razonSocialTransportista>TRANSPORTES GARCIA CIA. LTDA.</razonSocialTransportista>');
    expect(xml).toContain('<tipoIdentificacionTransportista>04</tipoIdentificacionTransportista>');
    expect(xml).toContain('<rucTransportista>0991234567001</rucTransportista>');
    expect(xml).toContain('<obligadoContabilidad>SI</obligadoContabilidad>');
    expect(xml).toContain('<fechaIniTransporte>06/03/2026</fechaIniTransporte>');
    expect(xml).toContain('<fechaFinTransporte>07/03/2026</fechaFinTransporte>');
    expect(xml).toContain('<placa>GYE-1234</placa>');
  });

  it('should include destinatarios', () => {
    const xml = gen.generate(baseData);
    expect(xml).toContain('<destinatarios>');
    expect(xml).toContain('<destinatario>');
    expect(xml).toContain('<identificacionDestinatario>0706410164001</identificacionDestinatario>');
    expect(xml).toContain('<razonSocialDestinatario>CLIENTE QUITO S.A.</razonSocialDestinatario>');
    expect(xml).toContain('<dirDestinatario>Av. Amazonas N36-152, Quito</dirDestinatario>');
    expect(xml).toContain('<motivoTraslado>Venta de mercaderia</motivoTraslado>');
    expect(xml).toContain('<codDocSustento>01</codDocSustento>');
    expect(xml).toContain('<numDocSustento>001-001-000000010</numDocSustento>');
    expect(xml).toContain('<fechaEmisionDocSustento>05/03/2026</fechaEmisionDocSustento>');
  });

  it('should include detalles within destinatario', () => {
    const xml = gen.generate(baseData);
    expect(xml).toContain('<detalles>');
    expect(xml).toContain('<detalle>');
    expect(xml).toContain('<codigoInterno>PROD001</codigoInterno>');
    expect(xml).toContain('<descripcion>Producto A - Caja x12</descripcion>');
    expect(xml).toContain('<cantidad>50.000000</cantidad>');
    expect(xml).toContain('<codigoInterno>PROD002</codigoInterno>');
    expect(xml).toContain('<cantidad>30.000000</cantidad>');
  });

  it('should include optional dirEstablecimiento', () => {
    const xml = gen.generate({ ...baseData, dirEstablecimiento: 'Sucursal Norte' });
    expect(xml).toContain('<dirEstablecimiento>Sucursal Norte</dirEstablecimiento>');
  });

  it('should include optional contribuyenteEspecial', () => {
    const xml = gen.generate({ ...baseData, contribuyenteEspecial: '1234' });
    expect(xml).toContain('<contribuyenteEspecial>1234</contribuyenteEspecial>');
  });

  it('should include optional rise', () => {
    const xml = gen.generate({ ...baseData, rise: 'Contribuyente RISE' });
    expect(xml).toContain('<rise>Contribuyente RISE</rise>');
  });

  it('should include nombreComercial when set', () => {
    const xml = gen.generate({ ...baseData, nombreComercial: 'TRANSPORTES GARCIA' });
    expect(xml).toContain('<nombreComercial>TRANSPORTES GARCIA</nombreComercial>');
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

  it('should include optional docAduaneroUnico', () => {
    const data = {
      ...baseData,
      destinatarios: [{
        ...baseData.destinatarios[0],
        docAduaneroUnico: 'DAU-2026-001',
      }],
    };
    const xml = gen.generate(data);
    expect(xml).toContain('<docAduaneroUnico>DAU-2026-001</docAduaneroUnico>');
  });

  it('should include optional codEstabDestino', () => {
    const data = {
      ...baseData,
      destinatarios: [{
        ...baseData.destinatarios[0],
        codEstabDestino: '002',
      }],
    };
    const xml = gen.generate(data);
    expect(xml).toContain('<codEstabDestino>002</codEstabDestino>');
  });

  it('should include optional ruta', () => {
    const data = {
      ...baseData,
      destinatarios: [{
        ...baseData.destinatarios[0],
        ruta: 'GYE-UIO Via principal',
      }],
    };
    const xml = gen.generate(data);
    expect(xml).toContain('<ruta>GYE-UIO Via principal</ruta>');
  });

  it('should include optional numAutDocSustento', () => {
    const data = {
      ...baseData,
      destinatarios: [{
        ...baseData.destinatarios[0],
        numAutDocSustento: '0603202601099219181300110010010000000011234567813',
      }],
    };
    const xml = gen.generate(data);
    expect(xml).toContain('<numAutDocSustento>');
  });

  it('should include codigoAdicional on detalle items', () => {
    const data = {
      ...baseData,
      destinatarios: [{
        ...baseData.destinatarios[0],
        detalles: [{
          codigoInterno: 'PROD001',
          codigoAdicional: 'AUX-001',
          descripcion: 'Producto A',
          cantidad: 10,
        }],
      }],
    };
    const xml = gen.generate(data);
    expect(xml).toContain('<codigoAdicional>AUX-001</codigoAdicional>');
  });

  it('should handle multiple destinatarios', () => {
    const data = {
      ...baseData,
      destinatarios: [
        baseData.destinatarios[0],
        {
          identificacionDestinatario: '0991234567001',
          razonSocialDestinatario: 'CLIENTE CUENCA S.A.',
          dirDestinatario: 'Av. Solano 1-23, Cuenca',
          motivoTraslado: 'Transferencia entre bodegas',
          detalles: [
            { descripcion: 'Producto C', cantidad: 100 },
          ],
        },
      ],
    };
    const xml = gen.generate(data);
    expect(xml).toContain('CLIENTE QUITO S.A.');
    expect(xml).toContain('CLIENTE CUENCA S.A.');
    expect(xml).toContain('Transferencia entre bodegas');
  });

  it('should include infoAdicional', () => {
    const xml = gen.generate({
      ...baseData,
      infoAdicional: [
        { nombre: 'Email', valor: 'logistica@empresa.com' },
        { nombre: 'Telefono', valor: '04-2000000' },
      ],
    });
    expect(xml).toContain('<infoAdicional>');
    expect(xml).toContain('nombre="Email"');
    expect(xml).toContain('logistica@empresa.com');
  });

  it('should omit infoAdicional when not provided', () => {
    const xml = gen.generate(baseData);
    expect(xml).not.toContain('<infoAdicional>');
  });
});
