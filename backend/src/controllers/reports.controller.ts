import type { Request, Response } from 'express';
import { asyncHandler } from '../utils/asyncHandler';
import { AppError } from '../utils/apiResponse';
import { buildReport, type ReportType } from '../services/reports/reports.service';
import { toCsvBuffer, toExcelBuffer, toPdfBuffer } from '../utils/exporters';

const VALID_TYPES: ReportType[] = ['sales', 'item-sales', 'inventory', 'purchase-orders', 'outlet-comparison', 'tax-summary'];
const VALID_FORMATS = ['csv', 'excel', 'pdf'];

export const getReportHandler = asyncHandler(async (req: Request, res: Response) => {
  const type = req.query.type as ReportType;
  const format = (req.query.format as string) ?? 'csv';

  if (!VALID_TYPES.includes(type)) {
    throw new AppError(`Invalid report type. Must be one of: ${VALID_TYPES.join(', ')}`, 422);
  }
  if (!VALID_FORMATS.includes(format)) {
    throw new AppError(`Invalid format. Must be one of: ${VALID_FORMATS.join(', ')}`, 422);
  }

  const { title, columns, rows } = await buildReport(type, req.query as Record<string, string>);
  const filename = `${type}-${new Date().toISOString().slice(0, 10)}`;

  if (format === 'csv') {
    const buffer = toCsvBuffer(columns, rows);
    res.setHeader('Content-Type', 'text/csv; charset=utf-8');
    res.setHeader('Content-Disposition', `attachment; filename="${filename}.csv"`);
    return res.send(buffer);
  }

  if (format === 'excel') {
    const buffer = await toExcelBuffer(columns, rows, title);
    res.setHeader('Content-Type', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');
    res.setHeader('Content-Disposition', `attachment; filename="${filename}.xlsx"`);
    return res.send(buffer);
  }

  const buffer = await toPdfBuffer(title, columns, rows);
  res.setHeader('Content-Type', 'application/pdf');
  res.setHeader('Content-Disposition', `attachment; filename="${filename}.pdf"`);
  return res.send(buffer);
});
