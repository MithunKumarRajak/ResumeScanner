import { useState } from 'react';
import { X, Download, FileText, FileType, Code, Printer } from 'lucide-react';
import { useResumeStore } from '../../store/useResumeStore';
import toast from 'react-hot-toast';

export default function ExportModal({ onClose }: { onClose: () => void }) {
  const { getActiveResume } = useResumeStore();
  const resume = getActiveResume();
  const [exporting, setExporting] = useState<string | null>(null);

  if (!resume) return null;
  const { data } = resume;

  const fileName = data.personalInfo.fullName?.replace(/\s+/g, '_') || 'Resume';

  const exportPDF = async () => {
    setExporting('pdf');
    try {
      const el = document.getElementById('resume-preview-root');
      if (!el) { toast.error('Preview not found'); return; }
      const { default: html2canvas } = await import('html2canvas');
      const { default: jsPDF } = await import('jspdf');
      const canvas = await html2canvas(el, { scale: 2, useCORS: true, allowTaint: true, backgroundColor: '#fff' });
      const pdf = new jsPDF({ orientation: 'portrait', unit: 'mm', format: 'a4' });
      const imgData = canvas.toDataURL('image/png');
      const width = pdf.internal.pageSize.getWidth();
      const height = (canvas.height * width) / canvas.width;
      pdf.addImage(imgData, 'PNG', 0, 0, width, height);
      pdf.save(`${fileName}_Resume.pdf`);
      toast.success('PDF downloaded!');
    } catch (err) { toast.error('PDF export failed'); console.error(err); }
    finally { setExporting(null); }
  };

  const exportDOCX = async () => {
    setExporting('docx');
    try {
      const { Document, Packer, Paragraph, TextRun, HeadingLevel, AlignmentType } = await import('docx');
      const p = data.personalInfo;

      const doc = new Document({
        sections: [{
          children: [
            new Paragraph({ text: p.fullName, heading: HeadingLevel.HEADING_1, alignment: AlignmentType.CENTER }),
            new Paragraph({ text: p.title, alignment: AlignmentType.CENTER }),
            new Paragraph({ text: [p.email, p.phone, p.location, p.linkedin].filter(Boolean).join(' | '), alignment: AlignmentType.CENTER }),
            ...(data.summary ? [
              new Paragraph({ text: '' }),
              new Paragraph({ text: 'PROFESSIONAL SUMMARY', heading: HeadingLevel.HEADING_2 }),
              new Paragraph({ text: data.summary }),
            ] : []),
            ...(data.experience.length > 0 ? [
              new Paragraph({ text: '' }),
              new Paragraph({ text: 'WORK EXPERIENCE', heading: HeadingLevel.HEADING_2 }),
              ...data.experience.flatMap((exp) => [
                new Paragraph({ children: [new TextRun({ text: `${exp.title} @ ${exp.company}`, bold: true }), new TextRun({ text: ` — ${exp.startDate}${exp.endDate ? ` to ${exp.endDate}` : ''}`, color: '666666' })] }),
                new Paragraph({ text: exp.description }),
                new Paragraph({ text: '' }),
              ]),
            ] : []),
            ...(data.education.length > 0 ? [
              new Paragraph({ text: 'EDUCATION', heading: HeadingLevel.HEADING_2 }),
              ...data.education.map((edu) => new Paragraph({ text: `${edu.degree}${edu.fieldOfStudy ? `, ${edu.fieldOfStudy}` : ''} — ${edu.institution} (${edu.graduationYear})` })),
            ] : []),
            ...(data.skills.length > 0 ? [
              new Paragraph({ text: '' }),
              new Paragraph({ text: 'SKILLS', heading: HeadingLevel.HEADING_2 }),
              new Paragraph({ text: data.skills.map((s) => s.name).join(', ') }),
            ] : []),
          ],
        }],
      });

      const blob = await Packer.toBlob(doc);
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a'); a.href = url; a.download = `${fileName}_Resume.docx`; a.click(); URL.revokeObjectURL(url);
      toast.success('DOCX downloaded!');
    } catch (err) { toast.error('DOCX export failed'); console.error(err); }
    finally { setExporting(null); }
  };

  const exportTXT = () => {
    setExporting('txt');
    const p = data.personalInfo;
    let txt = `${p.fullName}\n${p.title}\n`;
    txt += [p.email, p.phone, p.location, p.linkedin, p.github].filter(Boolean).join(' | ') + '\n';
    txt += '='.repeat(60) + '\n\n';
    if (data.summary) txt += `PROFESSIONAL SUMMARY\n${'-'.repeat(40)}\n${data.summary}\n\n`;
    if (data.experience.length) {
      txt += `WORK EXPERIENCE\n${'-'.repeat(40)}\n`;
      data.experience.forEach(e => { txt += `${e.title} @ ${e.company} | ${e.startDate}${e.endDate ? ` - ${e.endDate}` : ''}\n${e.description}\n\n`; });
    }
    if (data.education.length) {
      txt += `EDUCATION\n${'-'.repeat(40)}\n`;
      data.education.forEach(e => { txt += `${e.degree}${e.fieldOfStudy ? `, ${e.fieldOfStudy}` : ''} | ${e.institution} | ${e.graduationYear}\n`; });
      txt += '\n';
    }
    if (data.skills.length) txt += `SKILLS\n${'-'.repeat(40)}\n${data.skills.map(s => s.name).join(', ')}\n\n`;
    if (data.certifications.length) {
      txt += `CERTIFICATIONS\n${'-'.repeat(40)}\n`;
      data.certifications.forEach(c => { txt += `${c.name} — ${c.issuer} (${c.date})\n`; });
    }
    const blob = new Blob([txt], { type: 'text/plain' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a'); a.href = url; a.download = `${fileName}_Resume.txt`; a.click(); URL.revokeObjectURL(url);
    toast.success('TXT downloaded!');
    setExporting(null);
  };

  const exportJSON = () => {
    setExporting('json');
    const blob = new Blob([JSON.stringify(resume, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a'); a.href = url; a.download = `${fileName}_Resume.json`; a.click(); URL.revokeObjectURL(url);
    toast.success('JSON downloaded!');
    setExporting(null);
  };

  const exportOptions = [
    { id: 'pdf', label: 'PDF', desc: 'Pixel-perfect, print-ready A4', icon: <Printer size={20} />, color: '#ef4444', action: exportPDF },
    { id: 'docx', label: 'Word (.docx)', desc: 'Editable Microsoft Word file', icon: <FileText size={20} />, color: '#2563eb', action: exportDOCX },
    { id: 'txt', label: 'Plain Text (.txt)', desc: 'ATS-friendly stripped version', icon: <FileType size={20} />, color: '#10b981', action: exportTXT },
    { id: 'json', label: 'JSON Backup', desc: 'Full data backup & restore', icon: <Code size={20} />, color: '#f59e0b', action: exportJSON },
  ];

  return (
    <div className="modal-overlay" onClick={(e) => e.target === e.currentTarget && onClose()}>
      <div className="modal modal-sm">
        <div className="modal-header">
          <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
            <Download size={18} color="var(--accent)" />
            <h2 style={{ fontSize: 16, fontWeight: 700, margin: 0 }}>Export Resume</h2>
          </div>
          <button className="btn-icon" onClick={onClose}><X size={18} /></button>
        </div>
        <div className="modal-body" style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
          {exportOptions.map((opt) => (
            <button
              key={opt.id}
              onClick={opt.action}
              disabled={exporting === opt.id}
              style={{
                display: 'flex', alignItems: 'center', gap: 14, padding: '14px 16px',
                background: 'var(--bg-card)', border: '1px solid var(--border)',
                borderRadius: 'var(--radius-md)', cursor: 'pointer', textAlign: 'left',
                transition: 'all 0.15s', width: '100%',
              }}
              onMouseEnter={(e) => { (e.currentTarget as HTMLButtonElement).style.borderColor = opt.color; (e.currentTarget as HTMLButtonElement).style.background = `${opt.color}08`; }}
              onMouseLeave={(e) => { (e.currentTarget as HTMLButtonElement).style.borderColor = 'var(--border)'; (e.currentTarget as HTMLButtonElement).style.background = 'var(--bg-card)'; }}
            >
              <div style={{ width: 40, height: 40, borderRadius: 10, background: `${opt.color}15`, display: 'flex', alignItems: 'center', justifyContent: 'center', color: opt.color, flexShrink: 0 }}>
                {exporting === opt.id ? <div className="animate-spin" style={{ width: 18, height: 18, border: `2px solid ${opt.color}`, borderTopColor: 'transparent', borderRadius: '50%' }} /> : opt.icon}
              </div>
              <div>
                <div style={{ fontWeight: 600, fontSize: 14, color: 'var(--text-primary)' }}>{opt.label}</div>
                <div style={{ fontSize: 12, color: 'var(--text-muted)' }}>{opt.desc}</div>
              </div>
            </button>
          ))}
        </div>
      </div>
    </div>
  );
}
