import * as XLSX from 'xlsx';

/**
 * Universal Mobile (APK Native Bridge + Browser) Excel (.xlsx) File Downloader
 * - If running inside React Native Android APK: Posts Base64 to native bridge for direct device saving.
 * - If running in standard browser: Triggers standard Blob OpenXML download.
 */
export const downloadXlsxWorkbook = (wb: XLSX.WorkBook, filename: string): boolean => {
  const safeFilename = filename.endsWith('.xlsx') ? filename : `${filename}.xlsx`;

  // 1. Android APK Native Bridge Hook
  try {
    if (typeof window !== 'undefined' && (window as any).ReactNativeWebView) {
      const b64 = XLSX.write(wb, { bookType: 'xlsx', type: 'base64' });
      (window as any).ReactNativeWebView.postMessage(
        JSON.stringify({
          type: 'DOWNLOAD_FILE',
          dataUrl: `data:application/vnd.openxmlformats-officedocument.spreadsheetml.sheet;base64,${b64}`,
          filename: safeFilename,
          title: `Save ${safeFilename}`,
        })
      );
      return true;
    }
  } catch (bridgeErr) {
    console.warn('Native WebView bridge error, falling back to browser blob:', bridgeErr);
  }

  // 2. Standard Browser Blob Download
  try {
    const wbout = XLSX.write(wb, { bookType: 'xlsx', type: 'array' });
    const blob = new Blob([wbout], {
      type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
    });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.style.display = 'none';
    a.href = url;
    a.download = safeFilename;
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
      XLSX.writeFile(wb, safeFilename);
      return true;
    } catch (fallbackErr) {
      console.error('XLSX.writeFile fallback failed:', fallbackErr);
      return false;
    }
  }
};
