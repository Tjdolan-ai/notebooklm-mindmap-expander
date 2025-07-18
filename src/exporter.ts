import jsPDF from 'jspdf';
import TurndownService from 'turndown';

export async function exportToPdf(htmlContent: string, fileName: string): Promise<void> {
  const doc = new jsPDF();
  doc.html(htmlContent, {
    callback: (doc) => {
      doc.save(fileName);
    },
    x: 10,
    y: 10
  });
}

export function exportToMarkdown(htmlContent: string): string {
  const turndownService = new TurndownService();
  return turndownService.turndown(htmlContent);
}
