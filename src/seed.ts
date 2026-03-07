import { DataSource } from 'typeorm';
import * as bcrypt from 'bcrypt';
import { randomBytes } from 'crypto';

function apiKey() {
  return 'fec_' + randomBytes(24).toString('hex');
}
function accessKey49() {
  // 49-digit numeric SRI access key
  let key = '';
  for (let i = 0; i < 49; i++) key += Math.floor(Math.random() * 10);
  return key;
}
function seq(est: string, emp: string, n: number) {
  return `${est}-${emp}-${String(n).padStart(9, '0')}`;
}

async function seed() {
  const ds = new DataSource({
    type: 'postgres',
    host: 'localhost',
    port: 5437,
    username: 'postgres',
    password: '62563',
    database: 'facturador',
    schema: 'app',
  });

  await ds.initialize();
  console.log('Connected to database');

  // ============ PLATFORM ADMIN ============
  const adminHash = await bcrypt.hash('admin123', 10);
  await ds.query(
    `INSERT INTO app.platform_admin (pad_name, pad_email, pad_password_hash)
     VALUES ($1, $2, $3)
     ON CONFLICT (pad_email) DO UPDATE SET pad_password_hash = $3`,
    ['Admin FacturaEC', 'admin@facturaec.com', adminHash],
  );
  console.log('  Platform admin seeded');

  // ============ ACCOUNTS ============
  const userHash = await bcrypt.hash('user123', 10);

  // Account 1 - Single company
  const [acc1] = await ds.query(
    `INSERT INTO app.account (acc_name, acc_ruc, acc_email, acc_phone, acc_address, acc_type, acc_billing_cycle_day)
     VALUES ($1, $2, $3, $4, $5, 'single', 1)
     ON CONFLICT (acc_ruc) DO UPDATE SET acc_name = $1
     RETURNING acc_id`,
    ['Comercial Guayaquil S.A.', '0992345678001', 'admin@comercialgye.com', '042345678', 'Av. 9 de Octubre 123, Guayaquil'],
  );
  const accId1 = acc1.acc_id;

  // Account 2 - Multi company
  const [acc2] = await ds.query(
    `INSERT INTO app.account (acc_name, acc_ruc, acc_email, acc_phone, acc_address, acc_type, acc_billing_cycle_day)
     VALUES ($1, $2, $3, $4, $5, 'multi', 15)
     ON CONFLICT (acc_ruc) DO UPDATE SET acc_name = $1
     RETURNING acc_id`,
    ['Grupo Empresarial del Pacífico', '1791234567001', 'admin@grupoacifico.com', '022987654', 'Av. Amazonas N34-56, Quito'],
  );
  const accId2 = acc2.acc_id;

  // Account 3 - Single, with warning
  const [acc3] = await ds.query(
    `INSERT INTO app.account (acc_name, acc_ruc, acc_email, acc_phone, acc_address, acc_type, acc_billing_cycle_day, acc_warning_message)
     VALUES ($1, $2, $3, $4, $5, 'single', 1, $6)
     ON CONFLICT (acc_ruc) DO UPDATE SET acc_name = $1, acc_warning_message = $6
     RETURNING acc_id`,
    ['Minimarket Don Pepe', '0601234567001', 'pepe@minimarket.com', '032456789', 'Bolívar 5-20, Riobamba',
     'Su cuenta tiene una factura pendiente de pago. Por favor regularice su situación para evitar la suspensión del servicio.'],
  );
  const accId3 = acc3.acc_id;

  // Account 4 - Multi
  const [acc4] = await ds.query(
    `INSERT INTO app.account (acc_name, acc_ruc, acc_email, acc_phone, acc_address, acc_type, acc_billing_cycle_day)
     VALUES ($1, $2, $3, $4, $5, 'multi', 5)
     ON CONFLICT (acc_ruc) DO UPDATE SET acc_name = $1
     RETURNING acc_id`,
    ['TechSolutions Ecuador', '1792345678001', 'info@techsolutions.ec', '022876543', 'Av. República E7-123, Quito'],
  );
  const accId4 = acc4.acc_id;

  console.log('  4 accounts seeded');

  // ============ ACCOUNT USERS ============
  const users = [
    [accId1, 'Carlos Pérez', 'carlos@comercialgye.com', 'admin'],
    [accId1, 'María García', 'maria@comercialgye.com', 'operator'],
    [accId2, 'Juan López', 'juan@grupoacifico.com', 'admin'],
    [accId2, 'Ana Torres', 'ana@grupoacifico.com', 'operator'],
    [accId2, 'Pedro Ruiz', 'pedro@grupoacifico.com', 'viewer'],
    [accId3, 'José Pérez', 'jose@minimarket.com', 'admin'],
    [accId4, 'Laura Mendoza', 'laura@techsolutions.ec', 'admin'],
    [accId4, 'Diego Sánchez', 'diego@techsolutions.ec', 'operator'],
  ];
  for (const [aId, name, email, role] of users) {
    await ds.query(
      `INSERT INTO app.account_user (acc_id, aus_name, aus_email, aus_password_hash, aus_role)
       VALUES ($1, $2, $3, $4, $5)
       ON CONFLICT (aus_email) DO UPDATE SET aus_name = $2, aus_role = $5`,
      [aId, name, email, userHash, role],
    );
  }
  console.log('  8 account users seeded');

  // ============ COMPANIES ============
  // Plans: 1=basic, 2=professional, 3=enterprise, 4=custom
  const companies: [number, number, string, string, string, string, string, string, string, string, boolean][] = [
    // accId, planId, name, tradeName, ruc, address, email, phone, env, establishment, overageEnabled
    [accId1, 2, 'Comercial Guayaquil S.A.', 'ComGuaya', '0992345678001', 'Av. 9 de Octubre 123, Guayaquil', 'facturacion@comercialgye.com', '042345678', 'production', '001', true],
    [accId2, 3, 'Distribuidora Nacional Ltda.', 'DistriNac', '1791234567001', 'Av. Amazonas N34-56, Quito', 'facturacion@distrinac.com', '022987654', 'production', '001', true],
    [accId2, 2, 'Importadora del Pacífico S.A.', 'ImportPac', '1793456789001', 'Calle Colón E4-12, Quito', 'facturacion@importpac.com', '022654321', 'production', '001', false],
    [accId2, 1, 'Servicios Logísticos GEP', 'LogiGEP', '1794567890001', 'Panamericana Norte Km 5, Quito', 'facturacion@logigep.com', '022543210', 'test', '001', false],
    [accId3, 1, 'Minimarket Don Pepe', 'Don Pepe', '0601234567001', 'Bolívar 5-20, Riobamba', 'facturacion@minimarket.com', '032456789', 'production', '001', false],
    [accId4, 3, 'TechSolutions Ecuador S.A.', 'TechSol', '1792345678001', 'Av. República E7-123, Quito', 'facturacion@techsolutions.ec', '022876543', 'production', '001', true],
    [accId4, 2, 'CloudServ Ecuador', 'CloudServ', '1795678901001', 'Av. Eloy Alfaro N50-22, Quito', 'facturacion@cloudserv.ec', '022765432', 'production', '002', false],
  ];

  const companyIds: number[] = [];
  for (const [aId, planId, name, trade, ruc, addr, email, phone, env, est, overage] of companies) {
    const [row] = await ds.query(
      `INSERT INTO app.company (acc_id, spl_id, com_name, com_trade_name, com_ruc, com_address, com_email, com_phone, com_env, com_establishment, com_api_key, com_overage_enabled)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12)
       ON CONFLICT (com_ruc) DO UPDATE SET com_name = $3, spl_id = $2
       RETURNING com_id`,
      [aId, planId, name, trade, ruc, addr, email, phone, env, est, apiKey(), overage],
    );
    companyIds.push(row.com_id);
  }
  console.log(`  ${companyIds.length} companies seeded`);

  // ============ EMISSION POINTS ============
  const emissionPoints: [number, string, string][] = [
    [companyIds[0], '001', 'Sucursal Principal Guayaquil'],
    [companyIds[0], '002', 'Sucursal Norte'],
    [companyIds[1], '001', 'Matriz Quito'],
    [companyIds[1], '002', 'Bodega Sur'],
    [companyIds[1], '003', 'Punto Guayaquil'],
    [companyIds[2], '001', 'Oficina Central'],
    [companyIds[3], '001', 'Centro Logístico'],
    [companyIds[4], '001', 'Local Principal'],
    [companyIds[5], '001', 'Oficina Quito'],
    [companyIds[5], '002', 'Oficina Guayaquil'],
    [companyIds[6], '001', 'Data Center'],
  ];
  for (const [cId, code, desc] of emissionPoints) {
    await ds.query(
      `INSERT INTO app.emission_point (com_id, emp_code, emp_description)
       VALUES ($1, $2, $3)
       ON CONFLICT (com_id, emp_code) DO UPDATE SET emp_description = $3`,
      [cId, code, desc],
    );
  }
  console.log('  11 emission points seeded');

  // ============ COMPANY DOC TYPES ============
  const docTypeSets: Record<number, string[]> = {
    0: ['01', '04', '07'],           // ComGuaya: factura, NC, retención
    1: ['01', '03', '04', '05', '06', '07'], // DistriNac: todos
    2: ['01', '04', '07'],           // ImportPac
    3: ['01', '04'],                 // LogiGEP (test)
    4: ['01', '04'],                 // Don Pepe (básico)
    5: ['01', '03', '04', '05', '06', '07'], // TechSol: todos
    6: ['01', '04', '05'],           // CloudServ
  };
  for (const [idx, codes] of Object.entries(docTypeSets)) {
    const cId = companyIds[Number(idx)];
    for (const code of codes) {
      await ds.query(
        `INSERT INTO app.company_doc_type (com_id, cdt_code)
         VALUES ($1, $2)
         ON CONFLICT (com_id, cdt_code) DO NOTHING`,
        [cId, code],
      );
    }
  }
  console.log('  Company doc types seeded');

  // ============ CERTIFICATES ============
  const certs: [number, string, string, number][] = [
    [companyIds[0], 'comercial_gye_2026.p12', '2026-12-31', 1],
    [companyIds[1], 'distrinac_2026.p12', '2026-08-15', 1],
    [companyIds[2], 'importpac_2026.p12', '2026-11-20', 1],
    [companyIds[4], 'donpepe_2025.p12', '2026-04-01', 1],   // expiring soon!
    [companyIds[5], 'techsol_2027.p12', '2027-06-30', 1],
    [companyIds[6], 'cloudserv_2026.p12', '2026-09-15', 1],
  ];
  for (const [cId, fname, expires, current] of certs) {
    await ds.query(
      `INSERT INTO app.certificate (com_id, cer_file_name, cer_s3_key, cer_password_enc, cer_expires_at, cer_is_current)
       VALUES ($1, $2, $3, $4, $5, $6)
       ON CONFLICT DO NOTHING`,
      [cId, fname, `certificates/${cId}/${fname}`, 'encrypted_placeholder', expires, current === 1],
    );
  }
  console.log('  6 certificates seeded');

  // ============ DOCUMENTS ============
  const docStatuses = ['AUTHORIZED', 'AUTHORIZED', 'AUTHORIZED', 'AUTHORIZED', 'AUTHORIZED',
    'REJECTED', 'FAILED', 'PROCESSING', 'CREATED', 'RECEIVED'];
  const docTypes = ['01', '01', '01', '04', '07', '01', '01', '01', '01', '04'];
  const buyers = [
    ['Juan Martínez', '04', '1712345678001'],
    ['María López', '05', '1234567890'],
    ['Empresa ABC S.A.', '04', '0991234567001'],
    ['Pedro Gómez', '05', '0501234567'],
    ['Comercial XYZ', '04', '1793456712001'],
    ['Ana Rodríguez', '05', '1712345679'],
    ['Consumidor Final', '07', '9999999999999'],
    ['Tech Corp S.A.', '04', '1794567891001'],
  ];

  let docCount = 0;
  // Generate docs for active companies (skip company index 3 which is test env)
  const activeCompanyIndices = [0, 1, 2, 4, 5, 6];
  for (const ci of activeCompanyIndices) {
    const cId = companyIds[ci];
    const numDocs = ci === 1 ? 15 : ci === 5 ? 12 : ci === 0 ? 10 : 5;

    for (let i = 1; i <= numDocs; i++) {
      const status = docStatuses[i % docStatuses.length];
      const typeCode = docTypes[i % docTypes.length];
      const buyer = buyers[i % buyers.length];
      const total = Math.round((Math.random() * 5000 + 50) * 100) / 100;
      const tax = Math.round(total * 0.15 * 100) / 100;
      const subtotal = Math.round((total - tax) * 100) / 100;
      const discount = Math.round(Math.random() * 20 * 100) / 100;

      const daysAgo = Math.floor(Math.random() * 60);
      const issueDate = new Date();
      issueDate.setDate(issueDate.getDate() - daysAgo);
      const issueDateStr = issueDate.toISOString().split('T')[0];

      const ak = accessKey49();
      const seqStr = seq('001', '001', i);
      const env = ci === 3 ? 'test' : 'production';
      const billable = status === 'AUTHORIZED';
      const processingMs = status === 'AUTHORIZED' ? Math.floor(Math.random() * 3000) + 500 : null;

      try {
        const [doc] = await ds.query(
          `INSERT INTO app.document (com_id, doc_type_code, doc_sequential, doc_access_key, doc_status, doc_env,
            doc_issue_date, doc_total_amount, doc_subtotal, doc_total_tax, doc_total_discount,
            doc_buyer_name, doc_buyer_id_type, doc_buyer_id, doc_establishment, doc_emission_point,
            doc_retries, doc_processing_time_ms, doc_billable, doc_received_at)
           VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13,$14,$15,$16,$17,$18,$19, now() - interval '${daysAgo} days')
           RETURNING doc_id`,
          [cId, typeCode, seqStr, ak, status, env,
           issueDateStr, total, subtotal, tax, discount,
           buyer[0], buyer[1], buyer[2], '001', '001',
           status === 'FAILED' ? 3 : 0, processingMs, billable],
        );
        docCount++;

        // Timeline for each document
        const steps = [
          { step: 'received', status: 'completed', order: 1, desc: 'Documento recibido via API' },
          { step: 'xml_generated', status: 'completed', order: 2, desc: 'XML generado correctamente' },
          { step: 'signed', status: 'completed', order: 3, desc: 'XML firmado con certificado digital' },
          { step: 'sent_sri', status: 'completed', order: 4, desc: 'Enviado al SRI' },
        ];

        if (status === 'AUTHORIZED') {
          steps.push({ step: 'sri_received', status: 'completed', order: 5, desc: 'SRI recibió el comprobante' });
          steps.push({ step: 'authorized', status: 'completed', order: 6, desc: 'Autorizado por el SRI' });
        } else if (status === 'REJECTED') {
          steps.push({ step: 'sri_received', status: 'completed', order: 5, desc: 'SRI recibió el comprobante' });
          steps.push({ step: 'rejected', status: 'error', order: 6, desc: 'Rechazado por el SRI' });
        } else if (status === 'FAILED') {
          steps[3] = { step: 'sent_sri', status: 'error', order: 4, desc: 'Error al enviar al SRI' };
        } else if (status === 'PROCESSING') {
          steps[3] = { step: 'sent_sri', status: 'current', order: 4, desc: 'Enviando al SRI...' };
        } else if (status === 'CREATED') {
          steps[1] = { step: 'xml_generated', status: 'current', order: 2, desc: 'Generando XML...' };
          steps.splice(2);
        } else if (status === 'RECEIVED') {
          steps.push({ step: 'sri_received', status: 'current', order: 5, desc: 'Esperando respuesta del SRI...' });
        }

        for (const s of steps) {
          const ts = new Date();
          ts.setDate(ts.getDate() - daysAgo);
          ts.setMinutes(ts.getMinutes() + s.order * 2);
          await ds.query(
            `INSERT INTO app.document_timeline (doc_id, dtl_step, dtl_status, dtl_timestamp, dtl_description, dtl_order, dtl_duration_ms)
             VALUES ($1, $2, $3, $4, $5, $6, $7)`,
            [doc.doc_id, s.step, s.status, ts, s.desc, s.order, Math.floor(Math.random() * 500) + 50],
          );
        }

        // Errors for rejected/failed docs
        if (status === 'REJECTED') {
          await ds.query(
            `INSERT INTO app.document_error (doc_id, der_code, der_message, der_detail, der_category, der_severity, der_field)
             VALUES ($1, $2, $3, $4, $5, $6, $7)`,
            [doc.doc_id, '35', 'DOCUMENTO RECHAZADO', 'El RUC del comprador no está registrado en el SRI', 'client', 'error', 'buyerId'],
          );
        }
        if (status === 'FAILED') {
          await ds.query(
            `INSERT INTO app.document_error (doc_id, der_code, der_message, der_detail, der_category, der_severity)
             VALUES ($1, $2, $3, $4, $5, $6)`,
            [doc.doc_id, '43', 'ERROR DE CONEXIÓN', 'No se pudo conectar con el servidor del SRI después de 3 intentos', 'system', 'critical'],
          );
        }
      } catch {
        // Skip on conflict (sequential unique constraint)
      }
    }
  }
  console.log(`  ${docCount} documents seeded (with timeline + errors)`);

  // ============ BILLING PERIODS ============
  // Current month and previous 2 months for acc1 and acc2
  const now = new Date();
  const billingData: [number, number, number, number, number, number, string][] = [
    // accId, planId, year, month, docsTotal, docsAuth, status
    [accId1, 2, now.getFullYear(), now.getMonth() + 1, 45, 42, 'pending'],
    [accId1, 2, now.getFullYear(), now.getMonth() || 12, 120, 115, 'paid'],
    [accId1, 2, now.getFullYear(), (now.getMonth() - 1) || 11, 98, 95, 'paid'],
    [accId2, 3, now.getFullYear(), now.getMonth() + 1, 320, 305, 'pending'],
    [accId2, 3, now.getFullYear(), now.getMonth() || 12, 485, 470, 'paid'],
    [accId3, 1, now.getFullYear(), now.getMonth() + 1, 15, 14, 'overdue'],
    [accId3, 1, now.getFullYear(), now.getMonth() || 12, 22, 20, 'overdue'],
    [accId4, 3, now.getFullYear(), now.getMonth() + 1, 180, 175, 'pending'],
  ];

  for (const [aId, pId, year, month, total, auth, status] of billingData) {
    // Get plan details for pricing
    const [plan] = await ds.query(`SELECT spl_monthly_price, spl_doc_limit, spl_overage_price FROM app.subscription_plan WHERE spl_id = $1`, [pId]);
    const basePrice = Number(plan.spl_monthly_price);
    const docLimit = plan.spl_doc_limit ? Number(plan.spl_doc_limit) : null;
    const overagePrice = plan.spl_overage_price ? Number(plan.spl_overage_price) : 0;
    const overageDocs = docLimit && auth > docLimit ? auth - docLimit : 0;
    const overageTotal = Math.round(overageDocs * overagePrice * 100) / 100;
    const bpeTotal = Math.round((basePrice + overageTotal) * 100) / 100;

    await ds.query(
      `INSERT INTO app.billing_period (acc_id, spl_id, bpe_year, bpe_month, bpe_docs_total, bpe_docs_authorized,
        bpe_doc_limit, bpe_base_price, bpe_overage_docs, bpe_overage_price, bpe_overage_total, bpe_total, bpe_status)
       VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13)
       ON CONFLICT (acc_id, bpe_year, bpe_month) DO UPDATE SET bpe_docs_total=$5, bpe_status=$13`,
      [aId, pId, year, month, total, auth, docLimit, basePrice, overageDocs, overagePrice, overageTotal, bpeTotal, status],
    );
  }
  console.log('  8 billing periods seeded');

  // ============ SYSTEM LOGS ============
  const logEntries: [number | null, string, string, string][] = [
    [companyIds[0], 'sri', 'info', 'Documento 001-001-000000001 autorizado por SRI'],
    [companyIds[0], 'webhook', 'info', 'Webhook entregado a https://comercialgye.com/webhook — 200 OK'],
    [companyIds[1], 'sri', 'warning', 'SRI respondió con timeout, reintentando documento 001-001-000000005'],
    [companyIds[1], 'sri', 'info', 'Documento 001-001-000000005 autorizado en reintento #2'],
    [companyIds[4], 'sri', 'error', 'Certificado digital próximo a expirar para Minimarket Don Pepe (30 días)'],
    [null, 'worker', 'info', 'Worker generate-xml procesó 45 documentos en cola'],
    [null, 'worker', 'info', 'Worker sign-xml procesó 45 documentos en cola'],
    [null, 'worker', 'warning', 'Worker send-sri: cola con 12 documentos pendientes, latencia alta'],
    [companyIds[5], 'webhook', 'error', 'Webhook falló para TechSolutions — timeout 30s a https://techsolutions.ec/api/webhook'],
    [companyIds[1], 'sri', 'info', 'Lote de 15 documentos procesados para Distribuidora Nacional'],
  ];
  for (const [cId, type, level, msg] of logEntries) {
    await ds.query(
      `INSERT INTO app.system_log (com_id, slg_type, slg_level, slg_message)
       VALUES ($1, $2, $3, $4)`,
      [cId, type, level, msg],
    );
  }
  console.log('  10 system logs seeded');

  // ============ NOTIFICATIONS ============
  const [admin] = await ds.query(`SELECT pad_id FROM app.platform_admin WHERE pad_email = 'admin@facturaec.com'`);
  const notifications: [string, string, string, string, string | null, number | null][] = [
    ['cert_expiring', 'Certificado próximo a vencer', 'El certificado de Minimarket Don Pepe vence el 2026-04-01. Renovar antes de esa fecha.', 'urgent', 'certificate', companyIds[4]],
    ['billing_overdue', 'Facturación vencida', 'La cuenta Minimarket Don Pepe tiene 2 períodos de facturación vencidos.', 'urgent', 'account', accId3],
    ['company_suspended', 'Nueva empresa registrada', 'TechSolutions Ecuador registró la empresa CloudServ Ecuador.', 'info', 'company', companyIds[6]],
    ['billing_overdue', 'Período de facturación pendiente', 'Grupo Empresarial del Pacífico tiene un saldo pendiente de $149.00.', 'info', 'account', accId2],
  ];
  for (const [type, title, message, priority, refType, refId] of notifications) {
    await ds.query(
      `INSERT INTO app.notification (pad_id, ntf_type, ntf_title, ntf_message, ntf_priority, ntf_ref_type, ntf_ref_id)
       VALUES ($1, $2, $3, $4, $5, $6, $7)`,
      [admin.pad_id, type, title, message, priority, refType, refId],
    );
  }
  console.log('  4 notifications seeded');

  await ds.destroy();
  console.log('\nSeed completed successfully!');
}

seed().catch((err) => {
  console.error(err);
  process.exit(1);
});
