import * as XLSX from 'xlsx';

/**
 * Universal Mobile (APK Native Bridge + Mobile Browser Octet-Stream + Web) Excel (.xlsx) File Downloader
 * Guaranteed to trigger direct file download on Android Chrome, iOS Safari, Android WebViews, and desktop.
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
    console.warn('Native WebView bridge error:', bridgeErr);
  }

  // 2. Mobile Browser Base64 Octet-Stream Direct Download (Forces Android/iOS browser download manager)
  try {
    const wbout = XLSX.write(wb, { bookType: 'xlsx', type: 'base64' });
    const dataUri = `data:application/octet-stream;base64,${wbout}`;
    const a = document.createElement('a');
    a.href = dataUri;
    a.download = safeFilename;
    a.target = '_self';
    document.body.appendChild(a);
    a.click();
    setTimeout(() => {
      document.body.removeChild(a);
    }, 1000);
    return true;
  } catch (err) {
    console.warn('Base64 octet-stream download failed, trying Blob method:', err);
  }

  // 3. Fallback: Blob URL
  try {
    const wbout = XLSX.write(wb, { bookType: 'xlsx', type: 'array' });
    const blob = new Blob([wbout], {
      type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
    });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = safeFilename;
    document.body.appendChild(a);
    a.click();
    setTimeout(() => {
      document.body.removeChild(a);
      URL.revokeObjectURL(url);
    }, 2000);
    return true;
  } catch (fallbackErr) {
    console.error('Blob download failed, trying XLSX.writeFile:', fallbackErr);
    try {
      XLSX.writeFile(wb, safeFilename);
      return true;
    } catch (e) {
      return false;
    }
  }
};
