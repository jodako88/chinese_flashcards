export function CsvUpload({ isImporting, importResult, onImport }) {
  function handleFileChange(event) {
    const [file] = event.target.files;

    onImport(file);
    event.target.value = '';
  }

  return (
    <section className="rounded-2xl border border-dashed border-stone-300 bg-white px-5 py-6 text-center shadow-sm">
      <div className="mx-auto mb-3 flex h-11 w-11 items-center justify-center rounded-full bg-indigo-50 text-lg text-indigo-700">
        CSV
      </div>
      <h2 className="text-lg font-medium text-stone-950">Update vocabulary</h2>
      <p className="mx-auto mt-2 max-w-md text-sm leading-6 text-stone-600">
        Upload a CSV to add or refresh words. Existing SRS progress is preserved.
      </p>

      <label className="mt-5 inline-flex cursor-pointer items-center justify-center rounded-xl border border-indigo-200 bg-indigo-50 px-5 py-2.5 text-sm font-medium text-indigo-700 transition hover:bg-indigo-100">
        <span>{isImporting ? 'Importing words...' : 'Choose CSV file'}</span>
        <input
          accept=".csv,text/csv"
          className="sr-only"
          disabled={isImporting}
          onChange={handleFileChange}
          type="file"
        />
      </label>

      {isImporting && (
        <div className="mx-auto mt-4 h-5 w-5 animate-spin rounded-full border-2 border-stone-200 border-t-indigo-500" />
      )}

      {!isImporting && importResult.hasResult && importResult.error && (
        <p className="mt-4 rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
          {importResult.error}
          {importResult.importedCount > 0 &&
            ` ${importResult.importedCount} rows were imported before the error.`}
        </p>
      )}

      {!isImporting && importResult.hasResult && !importResult.error && (
        <div className="mt-4 rounded-xl border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm text-emerald-800">
          Imported {importResult.importedCount} valid rows. Skipped {importResult.skippedCount} rows.
        </div>
      )}
    </section>
  );
}
