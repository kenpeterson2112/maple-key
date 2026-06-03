/**
 * Open a new window, write the given HTML, and trigger the print dialog.
 * Returns false if the popup was blocked.
 */
export function openPrintWindow(htmlContent: string): boolean {
  const printWindow = window.open("", "_blank")
  if (!printWindow) return false
  printWindow.document.write(htmlContent)
  printWindow.document.close()
  return true
}

/** Escape a value for safe interpolation inside HTML text or attribute. */
export function escapeHtml(value: unknown): string {
  return String(value ?? "")
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#39;")
}

/** Escape HTML and convert newlines to <br>. */
export function nl2br(value: string): string {
  return escapeHtml(value).replace(/\n/g, "<br>")
}

/** Shared <script> that fires window.print() once the doc has loaded. */
export const PRINT_ON_LOAD_SCRIPT = `
  <script>
    window.onload = function() {
      setTimeout(function() { window.print(); }, 350);
    };
  </script>
`
