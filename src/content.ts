import { exportToPdf, exportToMarkdown } from './exporter';

chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
  if (request.action === 'export') {
    const { format, all } = request;
    if (all) {
      handleBatchExport(format);
    } else {
      handleSingleExport(format);
    }
    sendResponse({ success: true });
  }
});

function getNoteContent(): string | null {
    // This is a placeholder selector. I will need to inspect the NotebookLM UI to get the correct one.
    const noteEditor = document.querySelector('.note-editor-container');
    return noteEditor ? noteEditor.innerHTML : null;
}

function getAllNotes(): { title: string, content: string }[] {
    // This is a placeholder selector. I will need to inspect the NotebookLM UI to get the correct one.
    const noteElements = document.querySelectorAll('.note-list-item');
    const notes = Array.from(noteElements).map(noteEl => {
        const title = noteEl.querySelector('.note-title')?.textContent || 'Untitled';
        const content = noteEl.querySelector('.note-content')?.innerHTML || '';
        return { title, content };
    });
    return notes;
}


function downloadMarkdown(markdown: string, fileName: string) {
  const blob = new Blob([markdown], { type: 'text/markdown' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = fileName;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
}

async function handleSingleExport(format: 'pdf' | 'md') {
  const content = getNoteContent();
  if (content) {
    const title = document.title.split(' - ')[0] || 'Note';
    if (format === 'pdf') {
      await exportToPdf(content, `${title}.pdf`);
    } else {
      const markdown = exportToMarkdown(content);
      downloadMarkdown(markdown, `${title}.md`);
    }
  } else {
    alert('Could not find note content to export.');
  }
}

async function handleBatchExport(format: 'pdf' | 'md') {
    const notes = getAllNotes();
    if (notes.length === 0) {
        alert('No notes found to export.');
        return;
    }

    for (let i = 0; i < notes.length; i++) {
        const note = notes[i];
        const progress = ((i + 1) / notes.length) * 100;
        chrome.runtime.sendMessage({ action: 'exportProgress', progress });

        if (format === 'pdf') {
            await exportToPdf(note.content, `${note.title}.pdf`);
        } else {
            const markdown = exportToMarkdown(note.content);
            downloadMarkdown(markdown, `${note.title}.md`);
        }
    }
}
