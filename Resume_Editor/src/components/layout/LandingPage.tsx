import { FileText, Plus, Upload, Key, LayoutDashboard } from 'lucide-react';
import { useResumeStore } from '../../store/useResumeStore';
import { useState } from 'react';
import ParseModal from '../modals/ParseModal';

export default function LandingPage() {
  const { createEmptyResume, resumes, setActiveView, apiKey } = useResumeStore();
  const [showParseModal, setShowParseModal] = useState(false);

  return (
    <div className="landing-container" style={{
      minHeight: '100vh',
      display: 'flex',
      flexDirection: 'column',
      justifyContent: 'center',
      alignItems: 'center',
      background: 'var(--bg-app)',
      padding: '40px 20px',
      position: 'relative',
      overflow: 'hidden'
    }}>
      {/* Background Decor */}
      <div style={{
        position: 'absolute',
        top: '-10%',
        right: '-5%',
        width: '40%',
        height: '40%',
        background: 'radial-gradient(circle, var(--accent) 0%, transparent 70%)',
        opacity: 0.05,
        filter: 'blur(100px)',
        zIndex: 0
      }} />
      <div style={{
        position: 'absolute',
        bottom: '-10%',
        left: '-5%',
        width: '40%',
        height: '40%',
        background: 'radial-gradient(circle, var(--ai-color) 0%, transparent 70%)',
        opacity: 0.05,
        filter: 'blur(100px)',
        zIndex: 0
      }} />

      <div style={{ textAlign: 'center', marginBottom: 48, zIndex: 1 }}>
        <h1 style={{ 
          fontSize: 'clamp(2.5rem, 8vw, 3.5rem)', 
          fontWeight: 900, 
          letterSpacing: '-0.02em',
          marginBottom: 16,
          background: 'linear-gradient(135deg, var(--text-primary) 0%, var(--text-secondary) 100%)',
          WebkitBackgroundClip: 'text',
          WebkitTextFillColor: 'transparent'
        }}>
          Build Your Future.
        </h1>
        <p style={{ fontSize: 18, color: 'var(--text-muted)', maxWidth: 600, margin: '0 auto' }}>
          Craft a professional, ATS-optimized resume in minutes with our AI-powered editor.
        </p>
      </div>

      <div style={{ 
        display: 'grid', 
        gridTemplateColumns: 'repeat(auto-fit, minmax(320px, 1fr))', 
        gap: 24, 
        width: '100%', 
        maxWidth: 900,
        zIndex: 1 
      }}>
        {/* OPTION 1: Parse */}
        <div 
          className="landing-card"
          onClick={() => setShowParseModal(true)}
          style={{
            background: 'var(--bg-card)',
            border: '1px solid var(--border)',
            borderRadius: 24,
            padding: 40,
            cursor: 'pointer',
            transition: 'all 0.3s cubic-bezier(0.4, 0, 0.2, 1)',
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'center',
            textAlign: 'center',
            gap: 24,
            boxShadow: 'var(--shadow-sm)'
          }}
          onMouseEnter={(e) => {
            e.currentTarget.style.transform = 'translateY(-8px)';
            e.currentTarget.style.borderColor = 'var(--accent)';
            e.currentTarget.style.boxShadow = 'var(--shadow-xl)';
          }}
          onMouseLeave={(e) => {
            e.currentTarget.style.transform = 'translateY(0)';
            e.currentTarget.style.borderColor = 'var(--border)';
            e.currentTarget.style.boxShadow = 'var(--shadow-sm)';
          }}
        >
          <div style={{ 
            width: 80, 
            height: 80, 
            borderRadius: 20, 
            background: 'rgba(99, 102, 241, 0.1)', 
            color: 'var(--accent)',
            display: 'flex', 
            alignItems: 'center', 
            justifyContent: 'center' 
          }}>
            <Upload size={36} strokeWidth={1.5} />
          </div>
          <div>
            <h3 style={{ fontSize: 24, fontWeight: 700, marginBottom: 8 }}>Parse Existing Resume</h3>
            <p style={{ color: 'var(--text-muted)', fontSize: 15, lineHeight: 1.5 }}>
              Upload a PDF or paste your text. AI extracts everything into beautiful editable sections.
            </p>
          </div>
          <div style={{ 
            padding: '8px 16px', 
            borderRadius: 12, 
            background: 'var(--bg-app)', 
            fontSize: 12, 
            fontWeight: 600, 
            color: 'var(--accent)',
            border: '1px solid rgba(99, 102, 241, 0.2)'
          }}>
            Fastest Option ✨
          </div>
        </div>

        {/* OPTION 2: Scratch */}
        <div 
          className="landing-card"
          onClick={() => createEmptyResume('My New Resume')}
          style={{
            background: 'var(--bg-card)',
            border: '1px solid var(--border)',
            borderRadius: 24,
            padding: 40,
            cursor: 'pointer',
            transition: 'all 0.3s cubic-bezier(0.4, 0, 0.2, 1)',
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'center',
            textAlign: 'center',
            gap: 24,
            boxShadow: 'var(--shadow-sm)'
          }}
          onMouseEnter={(e) => {
            e.currentTarget.style.transform = 'translateY(-8px)';
            e.currentTarget.style.borderColor = 'var(--ai-color)';
            e.currentTarget.style.boxShadow = 'var(--shadow-xl)';
          }}
          onMouseLeave={(e) => {
            e.currentTarget.style.transform = 'translateY(0)';
            e.currentTarget.style.borderColor = 'var(--border)';
            e.currentTarget.style.boxShadow = 'var(--shadow-sm)';
          }}
        >
          <div style={{ 
            width: 80, 
            height: 80, 
            borderRadius: 20, 
            background: 'rgba(16, 185, 129, 0.1)', 
            color: 'var(--success)',
            display: 'flex', 
            alignItems: 'center', 
            justifyContent: 'center' 
          }}>
            <Plus size={36} strokeWidth={1.5} />
          </div>
          <div>
            <h3 style={{ fontSize: 24, fontWeight: 700, marginBottom: 8 }}>Start From Scratch</h3>
            <p style={{ color: 'var(--text-muted)', fontSize: 15, lineHeight: 1.5 }}>
              Begin with a blank canvas. Add sections manually and use AI to polish each one.
            </p>
          </div>
          <div style={{ 
            padding: '8px 16px', 
            borderRadius: 12, 
            background: 'var(--bg-app)', 
            fontSize: 12, 
            fontWeight: 600, 
            color: 'var(--success)',
            border: '1px solid rgba(16, 185, 129, 0.2)'
          }}>
            Complete Control 🎨
          </div>
        </div>
      </div>

      {/* Footer / Secondary Actions */}
      <div style={{ marginTop: 64, display: 'flex', gap: 32, alignItems: 'center', zIndex: 1 }}>
        {resumes.length > 0 && (
          <button 
            className="btn btn-secondary" 
            onClick={() => setActiveView('dashboard')}
            style={{ display: 'flex', alignItems: 'center', gap: 8, padding: '12px 24px' }}
          >
            <LayoutDashboard size={18} />
            Go to Dashboard
          </button>
        )}
        {!apiKey && (
          <div style={{ display: 'flex', alignItems: 'center', gap: 10, color: 'var(--text-muted)', fontSize: 13 }}>
            <Key size={14} />
            <span>Claude API key not set? You can update it in Settings later.</span>
          </div>
        )}
      </div>

      {showParseModal && <ParseModal onClose={() => setShowParseModal(false)} />}
    </div>
  );
}
