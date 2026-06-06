declare module 'pdfjs-dist/legacy/build/pdf.mjs' {
  export interface PdfJsMetadataInfo {
    Title?: string;
    title?: string;
    Author?: string;
    author?: string;
  }

  export interface PdfJsTextItem {
    str: string;
    hasEOL?: boolean;
  }

  export interface PdfJsTextContent {
    items: Array<PdfJsTextItem | Record<string, unknown>>;
  }

  export interface PdfJsPageProxy {
    getTextContent(): Promise<PdfJsTextContent>;
    cleanup(): void;
  }

  export interface PdfJsDocumentProxy {
    numPages: number;
    getPage(pageNumber: number): Promise<PdfJsPageProxy>;
    getMetadata(): Promise<{ info?: PdfJsMetadataInfo }>;
  }

  export interface PdfJsLoadingTask {
    promise: Promise<PdfJsDocumentProxy>;
    destroy(): Promise<void>;
  }

  export function getDocument(options: {
    data: Uint8Array;
    useWorkerFetch?: boolean;
    isEvalSupported?: boolean;
  }): PdfJsLoadingTask;
}
