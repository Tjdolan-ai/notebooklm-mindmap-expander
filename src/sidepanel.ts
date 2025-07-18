// src/sidepanel.ts
import { CitationManager } from './citation';
import { saveAs } from 'file-saver';

const citationManager = new CitationManager();

document.addEventListener('DOMContentLoaded', () => {
  const generateBibliographyButton = document.getElementById('generate-bibliography');
  const exportBibtexButton = document.getElementById('export-bibtex');
  const manualEntryForm = document.getElementById('manual-entry-form');
  const bibliographyDiv = document.getElementById('bibliography');
  const citationListDiv = document.getElementById('citation-list');

  generateBibliographyButton?.addEventListener('click', () => {
    const bibliography = citationManager.generateBibliography('apa');
    if (bibliographyDiv) {
      bibliographyDiv.innerHTML = bibliography;
    }
  });

  exportBibtexButton?.addEventListener('click', () => {
    const bibtex = citationManager.exportBibTeX();
    if (bibtex) {
      const blob = new Blob([bibtex], { type: 'text/plain;charset=utf-8' });
      saveAs(blob, 'bibliography.bib');
    }
  });

  manualEntryForm?.addEventListener('submit', (event) => {
    event.preventDefault();
    const titleInput = document.getElementById('title') as HTMLInputElement;
    const authorInput = document.getElementById('author') as HTMLInputElement;
    const urlInput = document.getElementById('url') as HTMLInputElement;

    const metadata = {
      title: titleInput.value,
      author: [{
        family: authorInput.value.split(',')[0].trim(),
        given: authorInput.value.split(',')[1]?.trim() || '',
      }],
      URL: urlInput.value,
      accessed: {
        'date-parts': [[new Date().getFullYear(), new Date().getMonth() + 1, new Date().getDate()]],
      }
    };

    citationManager.addSource(metadata);
    renderCitationList();
    manualEntryForm.reset();
  });

  function renderCitationList() {
    if (citationListDiv) {
      citationListDiv.innerHTML = '';
      citationManager.getSources().forEach(source => {
        const citationItem = document.createElement('div');
        citationItem.className = 'citation-item';
        citationItem.innerHTML = `
          <p>${source.title}</p>
          <button class="copy-citation" data-title="${source.title}">Copy Citation</button>
        `;
        citationListDiv.appendChild(citationItem);
      });
    }
  }

  document.addEventListener('click', (event) => {
    const target = event.target as HTMLElement;
    if (target.classList.contains('copy-citation')) {
      const title = target.dataset.title;
      const source = citationManager.getSources().find(s => s.title === title);
      if (source) {
        const citation = citationManager.generateCitation(source, 'apa');
        navigator.clipboard.writeText(citation);
      }
    }
  });

  renderCitationList();
});
