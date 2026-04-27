export default function ResumeBuildPage() {
  // In development, the Resume Editor runs on port 5174
  // In production, use the built version from /resume-editor/index.html
  const editorUrl = import.meta.env.DEV
    ? 'http://localhost:5174'
    : '/resume-editor/index.html'

  return (
    <div className="w-full" style={{ height: 'calc(100vh - 64px)' }}>
      <iframe
        src={editorUrl}
        title="Resume Builder"
        className="w-full h-full border-none"
        style={{ display: 'block' }}
        id="resume-editor-iframe"
        allow="clipboard-write"
      />
    </div>
  )
}
