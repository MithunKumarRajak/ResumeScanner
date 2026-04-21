import { useState, useRef } from 'react';
import { X, Upload, FileText, Sparkles, Loader2, AlertCircle } from 'lucide-react';
import { useResumeStore } from '../../store/useResumeStore';
import { parseResumeText } from '../../lib/aiService';
import toast from 'react-hot-toast';
import * as pdfjs from 'pdfjs-dist';

// Initialize PDF.js worker
pdfjs.GlobalWorkerOptions.workerSrc = `//cdnjs.cloudflare.com/ajax/libs/pdf.js/${pdfjs.version}/pdf.worker.min.js`;

export default function ParseModal({ onClose }: { onClose: () => void }) {
  const { apiKey, importParsedData } = useResumeStore();
  const [activeTab, setActiveTab] = useState<'upload' | 'paste'>('upload');
  const [rawText, setRawText] = useState('');
  const [isParsing, setIsParsing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (file.type !== 'application/pdf') {
      toast.error('Please upload a PDF file');
      return;
    }

    setIsParsing(true);
    setError(null);

    try {
      const arrayBuffer = await file.arrayBuffer();
      const pdf = await pdfjs.getDocument({ data: arrayBuffer }).promise;
      let fullText = '';

      for (let i = 1; i <= pdf.numPages; i++) {
        const page = await pdf.getPage(i);
        const textContent = await page.getTextContent();
        const pageText = textContent.items.map((item: any) => item.str).join(' ');
        fullText += pageText + '\n';
      }

      setRawText(fullText);
      setActiveTab('paste'); // Switch to paste tab to show extracted text
      toast.success('PDF text extracted! Review and parse below.');
    } catch (err) {
      console.error('PDF extraction error:', err);
      setError('Could not read PDF. Please try pasting the text manually.');
    } finally {
      setIsParsing(false);
    }
  };

  const handleParse = async () => {
    if (!rawText.trim()) {
      toast.error('Please provide some resume text');
      return;
    }

    if (!apiKey) {
      toast.error('Claude API key missing. Set it in Settings to use parsing.');
      return;
    }

    setIsParsing(true);
    setError(null);

    try {
      const parsedData = await parseResumeText(apiKey, rawText);
      importParsedData(parsedData, 'Imported Resume');
      toast.success('Resume parsed successfully! ✨');
      onClose();
    } catch (err: any) {
      setError(err.message || 'Failed to parse resume. Please check your API key.');
    } finally {
      setIsParsing(false);
    }
  };

  return (
    <div className="modal-overlay" onClick={(e) => e.target === e.currentTarget && !isParsing && onClose()}>
      <div className="modal modal-md" style={{ maxWidth: 650 }}>
        <div className="modal-header">
          <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
            <Sparkles size={20} color="var(--accent)" />
            <h2 style={{ fontSize: 18, fontWeight: 700, margin: 0 }}>Parse Resume with AI</h2>
          </div>
          <button className="btn-icon" onClick={onClose} disabled={isParsing}><X size={20} /></button>
        </div>

        <div className="modal-body">
          {/* Tabs */}
          <div style={{ display: 'flex', borderBottom: '1px solid var(--border)', marginBottom: 24 }}>
            <button 
              onClick={() => setActiveTab('upload')}
              className={`tab-btn ${activeTab === 'upload' ? 'active' : ''}`}
              style={{
                flex: 1, padding: '12px', background: 'none', border: 'none',
                borderBottom: `2px solid ${activeTab === 'upload' ? 'var(--accent)' : 'transparent'}`,
                color: activeTab === 'upload' ? 'var(--text-primary)' : 'var(--text-muted)',
                fontWeight: 600, cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8
              }}
            >
              <Upload size={16} /> Upload PDF
            </button>
            <button 
              onClick={() => setActiveTab('paste')}
              className={`tab-btn ${activeTab === 'paste' ? 'active' : ''}`}
              style={{
                flex: 1, padding: '12px', background: 'none', border: 'none',
                borderBottom: `2px solid ${activeTab === 'paste' ? 'var(--accent)' : 'transparent'}`,
                color: activeTab === 'paste' ? 'var(--text-primary)' : 'var(--text-muted)',
                fontWeight: 600, cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8
              }}
            >
              <FileText size={16} /> Paste Text
            </button>
          </div>

          {activeTab === 'upload' ? (
            <div 
              style={{
                border: '2px dashed var(--border)',
                borderRadius: 16,
                padding: '60px 40px',
                textAlign: 'center',
                cursor: 'pointer',
                transition: 'all 0.2s'
              }}
              onClick={() => fileInputRef.current?.click()}
              onDragOver={(e) => { e.preventDefault(); e.currentTarget.style.borderColor = 'var(--accent)'; e.currentTarget.style.background = 'var(--bg-app)'; }}
              onDragLeave={(e) => { e.preventDefault(); e.currentTarget.style.borderColor = 'var(--border)'; e.currentTarget.style.background = 'none'; }}
              onDrop={(e) => {
                e.preventDefault();
                const file = e.dataTransfer.files[0];
                if (file && file.type === 'application/pdf') {
                  const dataTransfer = new DataTransfer();
                  dataTransfer.items.add(file);
                  if (fileInputRef.current) {
                    fileInputRef.current.files = dataTransfer.files;
                    handleFileUpload({ target: fileInputRef.current } as any);
                  }
                } else {
                  toast.error('Only PDF files are supported for upload');
                }
              }}
            >
              <input 
                type="file" 
                ref={fileInputRef} 
                onChange={handleFileUpload} 
                accept=".pdf" 
                style={{ display: 'none' }} 
              />
              <div style={{ width: 64, height: 64, borderRadius: '50%', background: 'var(--bg-app)', display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 16px', color: 'var(--text-muted)' }}>
                {isParsing ? <Loader2 size={32} className="animate-spin" color="var(--accent)" /> : <Upload size={32} />}
              </div>
              <h3 style={{ fontSize: 16, fontWeight: 600, marginBottom: 8 }}>
                {isParsing ? 'Extracting text...' : 'Click to upload or drag and drop'}
              </h3>
              <p style={{ fontSize: 14, color: 'var(--text-muted)' }}>Only PDF files supported</p>
            </div>
          ) : (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
              <textarea
                value={rawText}
                onChange={(e) => setRawText(e.target.value)}
                placeholder="Paste your resume text here (e.g., from LinkedIn or Word)..."
                style={{ minHeight: 300, fontSize: 13, lineHeight: 1.6 }}
                disabled={isParsing}
              />
              <div style={{ display: 'flex', alignItems: 'center', gap: 10, padding: 12, background: 'rgba(99, 102, 241, 0.05)', borderRadius: 12, border: '1px solid rgba(99, 102, 241, 0.1)' }}>
                <Sparkles size={16} color="var(--accent)" />
                <span style={{ fontSize: 12, color: 'var(--text-secondary)' }}>
                  Our AI will organize this text into sections like Experience, Skills, and Education automatically.
                </span>
              </div>
            </div>
          )}

          {error && (
            <div style={{ marginTop: 20, display: 'flex', alignItems: 'center', gap: 8, color: 'var(--danger)', fontSize: 13 }}>
              <AlertCircle size={16} />
              <span>{error}</span>
            </div>
          )}
        </div>

        <div className="modal-footer" style={{ justifyContent: 'flex-end', gap: 12 }}>
          <button className="btn btn-ghost" onClick={onClose} disabled={isParsing}>Cancel</button>
          <button 
            className="btn btn-primary" 
            onClick={handleParse} 
            disabled={isParsing || !rawText.trim()}
            style={{ minWidth: 140, display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8 }}
          >
            {isParsing ? <Loader2 size={16} className="animate-spin" /> : <Sparkles size={16} />}
            {isParsing ? 'Parsing...' : 'Start Parsing'}
          </button>
        </div>
      </div>
    </div>
  );
}
