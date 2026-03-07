import { Injectable } from '@nestjs/common';
import { DataSource } from 'typeorm';
import { SriDocTypeCode } from '../../entities/enums';

@Injectable()
export class SequentialService {
  constructor(private readonly dataSource: DataSource) {}

  /**
   * Atomically reserves the next sequential number for a given series.
   * Creates the series row if it doesn't exist.
   * Returns the sequential as zero-padded 9-digit string: "000000001"
   */
  async nextSequential(
    companyId: number,
    docType: SriDocTypeCode,
    establishment: string,
    emissionPoint: string,
  ): Promise<{ sequential: string; fullSequential: string }> {
    // Use a single atomic upsert to avoid race conditions
    const rows: { seq: string }[] = await this.dataSource.query(
      `INSERT INTO app.company_series
         (com_id, cse_doc_type, cse_establishment, cse_emission_point, cse_next_sequential)
       VALUES ($1, $2, $3, $4, 2)
       ON CONFLICT (com_id, cse_doc_type, cse_establishment, cse_emission_point)
       DO UPDATE SET cse_next_sequential = app.company_series.cse_next_sequential + 1
       RETURNING cse_next_sequential - 1 AS seq`,
      [companyId, docType, establishment, emissionPoint],
    );

    const seqNumber = Number(rows[0].seq);
    if (!Number.isFinite(seqNumber) || seqNumber < 1) {
      throw new Error(`Sequential generation failed: got ${rows[0].seq} for company ${companyId}`);
    }

    const sequential = String(seqNumber).padStart(9, '0');
    const fullSequential = `${establishment}-${emissionPoint}-${sequential}`;

    return { sequential, fullSequential };
  }
}
