import { useState } from 'react';
import Papa from 'papaparse';

import { upsertVocabCard } from '../lib/db';

const REQUIRED_HEADERS = ['pinyin', 'english'];
const INITIAL_IMPORT_RESULT = {
  hasResult: false,
  importedCount: 0,
  skippedCount: 0,
  error: '',
};

function normalizeHeader(header) {
  return header.replace(/^\uFEFF/, '').trim().toLowerCase();
}

function normalizeOptionalValue(value) {
  const trimmed = String(value ?? '').trim();

  return trimmed === '' ? null : trimmed;
}

function buildImportRows(rows) {
  return rows.reduce(
    (result, row) => {
      const pinyin = String(row.pinyin ?? '').trim();
      const english = String(row.english ?? '').trim();

      if (!pinyin || !english) {
        result.skippedCount += 1;
        return result;
      }

      result.validRows.push({
        pinyin,
        english,
        hanzi: normalizeOptionalValue(row.hanzi),
        category: normalizeOptionalValue(row.category),
        notes: normalizeOptionalValue(row.notes),
      });

      return result;
    },
    { validRows: [], skippedCount: 0 },
  );
}

function parseCsvFile(file) {
  return new Promise((resolve, reject) => {
    Papa.parse(file, {
      header: true,
      skipEmptyLines: 'greedy',
      transformHeader: normalizeHeader,
      complete: ({ data, errors, meta }) => {
        if (errors.length > 0) {
          reject(new Error(errors[0].message || 'The CSV could not be parsed.'));
          return;
        }

        const fields = meta.fields ?? [];
        const missingHeaders = REQUIRED_HEADERS.filter((header) => !fields.includes(header));

        if (missingHeaders.length > 0) {
          reject(new Error(`Missing required column: ${missingHeaders.join(', ')}.`));
          return;
        }

        resolve(buildImportRows(data));
      },
      error: (error) => {
        reject(new Error(error.message || 'The CSV could not be read.'));
      },
    });
  });
}

export function useVocab() {
  const [isImporting, setIsImporting] = useState(false);
  const [importResult, setImportResult] = useState(INITIAL_IMPORT_RESULT);

  async function importCsvFile(file) {
    if (!file) {
      setImportResult({
        ...INITIAL_IMPORT_RESULT,
        hasResult: true,
        error: 'Choose a CSV file to import.',
      });
      return;
    }

    setIsImporting(true);
    setImportResult(INITIAL_IMPORT_RESULT);

    let importedCount = 0;
    let skippedCount = 0;

    try {
      const parsed = await parseCsvFile(file);
      skippedCount = parsed.skippedCount;

      for (const card of parsed.validRows) {
        await upsertVocabCard(card);
        importedCount += 1;
      }

      setImportResult({
        hasResult: true,
        importedCount,
        skippedCount,
        error: '',
      });
    } catch (error) {
      setImportResult({
        hasResult: true,
        importedCount,
        skippedCount,
        error: error.message || 'Import failed. Check the CSV and try again.',
      });
    } finally {
      setIsImporting(false);
    }
  }

  return {
    importCsvFile,
    importResult,
    isImporting,
  };
}
