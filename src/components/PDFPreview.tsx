import { useState } from "react";
import { Document, Page, pdfjs } from "react-pdf";
import { Button } from "@/components/ui/button";
import { Loader2, Download } from "lucide-react";
import "./pdf-preview.css";

// Configure PDF.js worker
pdfjs.GlobalWorkerOptions.workerSrc = `//unpkg.com/pdfjs-dist@${pdfjs.version}/build/pdf.worker.min.mjs`;

interface PDFPreviewProps {
  fileUrl: string;
  onDownload: () => void;
  canDownload: boolean;
  downloadCost: number;
}

export const PDFPreview = ({ fileUrl, onDownload, canDownload, downloadCost }: PDFPreviewProps) => {
  const [numPages, setNumPages] = useState<number>(0);
  const [loading, setLoading] = useState(true);

  const onDocumentLoadSuccess = ({ numPages }: { numPages: number }) => {
    setNumPages(numPages);
    setLoading(false);
  };

  const previewPages = Math.min(3, numPages); // Show max 3 pages as preview

  return (
    <div className="space-y-4">
      <div className="bg-muted/30 p-4 rounded-lg">
        <div className="flex items-center justify-between mb-4">
          <h3 className="font-semibold text-foreground">PDF Preview (First {previewPages} pages)</h3>
          <Button onClick={onDownload} disabled={!canDownload}>
            <Download className="mr-2 h-4 w-4" />
            Download Full PDF ({downloadCost} points)
          </Button>
        </div>

        {loading && (
          <div className="flex justify-center items-center py-12">
            <Loader2 className="h-8 w-8 animate-spin text-primary" />
          </div>
        )}

        <Document
          file={fileUrl}
          onLoadSuccess={onDocumentLoadSuccess}
          loading={
            <div className="flex justify-center items-center py-12">
              <Loader2 className="h-8 w-8 animate-spin text-primary" />
            </div>
          }
          className="space-y-4"
        >
          {Array.from(new Array(previewPages), (_, index) => (
            <div key={`page_${index + 1}`} className="border rounded-lg overflow-hidden bg-white">
              <Page
                pageNumber={index + 1}
                renderTextLayer={false}
                renderAnnotationLayer={false}
                width={Math.min(window.innerWidth - 100, 800)}
              />
            </div>
          ))}
        </Document>

        {numPages > previewPages && (
          <div className="text-center mt-4 p-4 bg-primary/10 rounded-lg">
            <p className="text-sm text-muted-foreground">
              Showing {previewPages} of {numPages} pages. Download to view the complete document.
            </p>
          </div>
        )}
      </div>
    </div>
  );
};
