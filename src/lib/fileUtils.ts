/**
 * File utility functions for import/export
 */

/**
 * Trigger file download
 */
export function downloadFile(content: string, filename: string, mimeType: string = 'text/xml'): void {
  const blob = new Blob([content], { type: mimeType });
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  link.download = filename;
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  URL.revokeObjectURL(url);
}

/**
 * Read file as text
 */
export function readFileAsText(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = (e) => {
      if (e.target?.result && typeof e.target.result === 'string') {
        resolve(e.target.result);
      } else {
        reject(new Error('Failed to read file as text'));
      }
    };
    reader.onerror = () => reject(new Error('File reading error'));
    reader.readAsText(file);
  });
}

/**
 * Trigger file picker and return selected file
 */
export function pickFile(accept: string = '.xml'): Promise<File> {
  return new Promise((resolve, reject) => {
    const input = document.createElement('input');
    input.type = 'file';
    input.accept = accept;
    input.onchange = (e) => {
      const file = (e.target as HTMLInputElement).files?.[0];
      if (file) {
        resolve(file);
      } else {
        reject(new Error('No file selected'));
      }
    };
    input.oncancel = () => reject(new Error('File selection cancelled'));
    input.click();
  });
}

/**
 * Show confirmation dialog
 */
export function showConfirmDialog(message: string): Promise<boolean> {
  return new Promise((resolve) => {
    const result = window.confirm(message);
    resolve(result);
  });
}
