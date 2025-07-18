// src/citation.ts
import { Cite } from 'citation-js';

export interface SourceMetadata {
  title?: string;
  author?: { given: string; family: string }[];
  URL?: string;
  accessed?: { 'date-parts': number[][] };
  [key: string]: any;
}

export class CitationManager {
  private sources: SourceMetadata[] = [];

  constructor() {
    this.discoverSources();
  }

  public discoverSources(): void {
    const sourceElements = document.querySelectorAll('.source-element'); // This selector will need to be adjusted
    sourceElements.forEach(element => {
      const title = (element.querySelector('.title-selector') as HTMLElement)?.innerText;
      const author = (element.querySelector('.author-selector') as HTMLElement)?.innerText;
      const url = (element.querySelector('.url-selector') as HTMLElement)?.innerText;

      if (title) {
        this.addSource({
          title,
          author: author ? [{ family: author.split(',')[0].trim(), given: author.split(',')[1]?.trim() || '' }] : [],
          URL: url,
          accessed: {
            'date-parts': [[new Date().getFullYear(), new Date().getMonth() + 1, new Date().getDate()]],
          },
        });
      }
    });
  }

  public addSource(metadata: SourceMetadata): void {
    this.sources.push(metadata);
  }

  public getSources(): SourceMetadata[] {
    return this.sources;
  }

  public generateCitation(metadata: SourceMetadata, format = 'apa'): string {
    try {
      const citation = new Cite(metadata);
      return citation.format('bibliography', {
        format: 'html',
        template: format,
        lang: 'en-US',
      });
    } catch (error) {
      console.error('Failed to generate citation:', error);
      return 'Could not generate citation for this source.';
    }
  }

  public generateBibliography(format = 'apa'): string {
    if (this.sources.length === 0) {
      return 'No sources found.';
    }

    try {
      const citation = new Cite(this.sources);
      return citation.format('bibliography', {
        format: 'html',
        template: format,
        lang: 'en-US',
      });
    } catch (error) {
      console.error('Failed to generate bibliography:', error);
      return 'Could not generate bibliography.';
    }
  }

  public exportBibTeX(): string {
    if (this.sources.length === 0) {
      return '';
    }

    try {
      const citation = new Cite(this.sources);
      return citation.format('bibtex');
    } catch (error) {
      console.error('Failed to generate BibTeX:', error);
      return '';
    }
  }
}
