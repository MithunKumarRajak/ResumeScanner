import { useState, useEffect } from 'react';
import { Toaster } from 'react-hot-toast';
import { useResumeStore } from './store/useResumeStore';
import AppHeader from './components/layout/AppHeader';
import EditorPanel from './components/editor/EditorPanel';
import PreviewPanel from './components/preview/PreviewPanel';
import ResumeDashboard from './components/dashboard/ResumeDashboard';
import AIToolsModal from './components/modals/AIToolsModal';
import ExportModal from './components/modals/ExportModal';
import SettingsModal from './components/modals/SettingsModal';
import VersionHistoryModal from './components/modals/VersionHistoryModal';
import KeyboardShortcutsModal from './components/modals/KeyboardShortcutsModal';
import OnboardingWizard from './components/modals/OnboardingWizard';
import { useKeyboardShortcuts } from './hooks/useKeyboardShortcuts';
import LandingPage from './components/layout/LandingPage';
import ATSModal from './components/modals/ATSModal';

type Modal = 'ai' | 'export' | 'settings' | 'history' | 'shortcuts' | 'ats' | null;

export default function App() {
  const { theme, activeView, setActiveView, showOnboarding, setShowOnboarding, saveSnapshot, mobileTab, getActiveResume } = useResumeStore();
  const [modal, setModal] = useState<Modal>(null);

  const resume = getActiveResume();

  // Apply theme
  useEffect(() => {
    document.documentElement.setAttribute('data-theme', theme);
  }, [theme]);

  // Auto-save every 5 minutes
  useEffect(() => {
    const interval = setInterval(() => {
      if (activeView === 'editor' && getActiveResume()) {
        saveSnapshot('Auto-save');
      }
    }, 5 * 60 * 1000);
    return () => clearInterval(interval);
  }, [activeView, saveSnapshot, getActiveResume]);

  // Keyboard shortcuts
  useKeyboardShortcuts({
    onSave: () => { saveSnapshot('Manual save'); },
    onPrint: () => window.print(),
    onShowShortcuts: () => setModal('shortcuts'),
    onToggleTheme: () => useResumeStore.getState().setTheme(theme === 'light' ? 'dark' : 'light'),
  });

  const closeModal = () => setModal(null);

  return (
    <div className="app-layout" data-theme={theme}>
      <Toaster
        position="bottom-right"
        toastOptions={{
          style: {
            background: 'var(--bg-card)',
            color: 'var(--text-primary)',
            border: '1px solid var(--border)',
            borderRadius: '10px',
            fontSize: '13px',
            boxShadow: 'var(--shadow-lg)',
          },
          duration: 3000,
        }}
      />

      {/* Onboarding */}
      {showOnboarding && (
        <OnboardingWizard onComplete={() => setShowOnboarding(false)} />
      )}

      {/* Modals */}
      {modal === 'ai' && <AIToolsModal onClose={closeModal} />}
      {modal === 'export' && <ExportModal onClose={closeModal} />}
      {modal === 'settings' && <SettingsModal onClose={closeModal} />}
      {modal === 'history' && <VersionHistoryModal onClose={closeModal} />}
      {modal === 'shortcuts' && <KeyboardShortcutsModal onClose={closeModal} />}
      {modal === 'ats' && <ATSModal onClose={closeModal} />}

      {/* Header */}
      {activeView !== 'landing' && (
        <AppHeader
          onExport={() => setModal('export')}
          onAITools={() => setModal('ai')}
          onSettings={() => setModal('settings')}
          onVersionHistory={() => setModal('history')}
          onShortcuts={() => setModal('shortcuts')}
          onATS={() => setModal('ats')}
          onDashboard={() => setActiveView('dashboard')}
        />
      )}

      {/* Main Content */}
      {activeView === 'landing' ? (
        <LandingPage />
      ) : activeView === 'dashboard' ? (
        <ResumeDashboard />
      ) : (
        <div className="editor-layout">
          {/* Left Editor Pane */}
          <div
            className="editor-pane"
            id="editor-pane"
            style={{
              display: 'flex',
            }}
          >
            <EditorPanel />
          </div>

          {/* Right Preview Pane — always visible on desktop */}
          <div
            className="preview-pane"
            id="preview-pane"
            style={{
              flex: 1,
              background: 'var(--bg-app)',
              overflowY: 'auto',
              display: 'flex',
              flexDirection: 'column',
              alignItems: 'center',
              padding: '24px 20px',
              gap: 16,
            }}
          >
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', width: '100%', maxWidth: 800, marginBottom: 12 }}>
              <span style={{ fontSize: 12, color: 'var(--text-muted)' }}>
                Live Preview · {resume?.style.template || 'modern'} template
              </span>
              <div style={{ display: 'flex', gap: 6 }}>
                <button
                  className="btn btn-secondary btn-sm"
                  onClick={() => setModal('export')}
                  style={{ display: 'flex', alignItems: 'center', gap: 5, fontSize: 11 }}
                >
                  Export →
                </button>
              </div>
            </div>
            <PreviewPanel />
          </div>
        </div>
      )}
    </div>
  );
}
