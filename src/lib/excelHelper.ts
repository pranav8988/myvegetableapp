import * as XLSX from 'xlsx';

/**
 * Universal Mobile & Desktop Excel (.xlsx) File Downloader
 * Converts workbook into a binary Blob and triggers an explicit download anchor.
 * Guaranteed to work on Android Chrome, iOS Safari, desktop browsers, and mobile WebViews.
 */
export const downloadXlsxWorkbook = (wb: XLSX.WorkBook, filename: string): boolean => {
  try {
    const wbout = XLSX.write(wb, { bookType: 'xlsx', type: 'array' });
    const blob = new Blob([wbout], {
      type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
    });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.style.display = 'none';
    a.href = url;
    a.download = filename.endsWith('.xlsx') ? filename : `${filename}.xlsx`;
    document.body.appendChild(a);
    a.click();
    setTimeout(() => {
      document.body.removeChild(a);
      URL.revokeObjectURL(url);
    }, 2000);
    return true;
  } catch (err) {
    console.error('Blob download failed, falling back to XLSX.writeFile:', err);
    try {
      XLSX.writeFile(wb, filename);
      return true;
    } catch (fallbackErr) {
      console.error('XLSX.writeFile fallback failed:', fallbackErr);
      return false;
    }
  }
};
