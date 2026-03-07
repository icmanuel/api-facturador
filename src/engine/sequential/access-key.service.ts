import { Injectable } from '@nestjs/common';
import { SriDocTypeCode, CompanyEnv } from '../../entities/enums';

/**
 * Generates the 49-digit SRI access key (clave de acceso).
 *
 * Structure (49 digits):
 *   [8]  fecha emisión DDMMAAAA
 *   [2]  tipo comprobante
 *   [13] RUC emisor
 *   [1]  tipo ambiente (1=pruebas, 2=produccion)
 *   [3]  serie (establecimiento)
 *   [3]  punto emisión
 *   [9]  secuencial
 *   [8]  código numérico (random)
 *   [1]  tipo emisión (1=normal)
 *   [1]  dígito verificador (módulo 11)
 */
@Injectable()
export class AccessKeyService {
  generate(params: {
    issueDate: Date;
    docType: SriDocTypeCode;
    ruc: string;
    env: CompanyEnv;
    establishment: string;
    emissionPoint: string;
    sequential: string;
  }): string {
    const { issueDate, docType, ruc, env, establishment, emissionPoint, sequential } = params;

    const dateStr = this.formatDate(issueDate);
    const envCode = env === CompanyEnv.PRODUCTION ? '2' : '1';
    const numericCode = this.randomNumericCode(8);
    const emissionType = '1'; // Normal emission

    const base =
      dateStr +          // 8 digits
      docType +          // 2 digits
      ruc +              // 13 digits
      envCode +          // 1 digit
      establishment +    // 3 digits
      emissionPoint +    // 3 digits
      sequential +       // 9 digits
      numericCode +      // 8 digits
      emissionType;      // 1 digit = 48 digits total

    if (!/^\d{48}$/.test(base)) {
      throw new Error(`Access key base is not 48 digits: "${base}" (len=${base.length})`);
    }

    const checkDigit = this.modulo11(base);

    return base + checkDigit; // 49 digits
  }

  /**
   * Format date as DDMMAAAA (SRI format)
   */
  private formatDate(date: Date): string {
    const dd = String(date.getDate()).padStart(2, '0');
    const mm = String(date.getMonth() + 1).padStart(2, '0');
    const yyyy = String(date.getFullYear());
    return dd + mm + yyyy;
  }

  /**
   * Generate random numeric string of given length
   */
  private randomNumericCode(length: number): string {
    let code = '';
    for (let i = 0; i < length; i++) {
      code += String(Math.floor(Math.random() * 10));
    }
    return code;
  }

  /**
   * SRI Modulo 11 check digit calculation.
   * Weights cycle: 2,3,4,5,6,7 from right to left.
   * Result: 11 - (sum % 11), with special cases for 10→1 and 11→0.
   */
  private modulo11(data: string): string {
    const weights = [2, 3, 4, 5, 6, 7];
    let sum = 0;

    const digits = data.split('').reverse();
    for (let i = 0; i < digits.length; i++) {
      sum += Number(digits[i]) * weights[i % weights.length];
    }

    const remainder = sum % 11;
    const result = 11 - remainder;

    if (result === 11) return '0';
    if (result === 10) return '1';
    return String(result);
  }
}
