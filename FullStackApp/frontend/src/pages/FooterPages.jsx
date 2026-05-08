import { Info, Shield, FileText, Mail, BookOpen, ArrowLeft } from 'lucide-react'
import { useNavigate } from 'react-router-dom'

function PageWrapper({ title, icon: Icon, children }) {
  const navigate = useNavigate()
  return (
    <div className="min-h-[calc(100vh-64px)] px-4 sm:px-6 lg:px-8 py-12 max-w-4xl mx-auto space-y-8 animate-fade-in">
      <button 
        onClick={() => navigate(-1)} 
        className="btn-ghost flex items-center gap-2 mb-4"
      >
        <ArrowLeft className="h-4 w-4" /> Back
      </button>

      <div className="flex items-center gap-4 mb-8">
        <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-white text-black shadow-lg">
          <Icon className="h-6 w-6" />
        </div>
        <div>
          <h1 className="text-3xl font-extrabold tracking-tight text-white">{title}</h1>
          <div className="h-1 w-12 bg-white mt-2 rounded-full" />
        </div>
      </div>

      <div className="glass-card p-8 prose prose-invert max-w-none space-y-6 text-slate-300 leading-relaxed">
        {children}
      </div>
    </div>
  )
}

export function AboutPage() {
  return (
    <PageWrapper title="About ResumeScanner" icon={Info}>
      <p className="text-lg">
        ResumeScanner is an AI-powered platform designed to bridge the gap between talented candidates and their dream roles. 
        Using advanced machine learning and natural language processing, we provide instant, actionable insights into resume quality and job compatibility.
      </p>
      
      <h2 className="text-xl font-bold text-white mt-8">Our Mission</h2>
      <p>
        To democratize the hiring process by giving candidates the same analytical tools that recruiters use, 
        ensuring that every professional has a fair shot at showcasing their true potential.
      </p>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mt-8">
        <div className="p-4 rounded-xl border border-white/10 bg-white/5">
          <h3 className="font-bold text-white mb-2">For Candidates</h3>
          <p className="text-sm">Get real-time feedback, ATS optimization tips, and see exactly how you match up against any job description.</p>
        </div>
        <div className="p-4 rounded-xl border border-white/10 bg-white/5">
          <h3 className="font-bold text-white mb-2">For Recruiters</h3>
          <p className="text-sm">Rank candidates instantly based on skill relevance and experience, reducing time-to-hire by over 60%.</p>
        </div>
      </div>
    </PageWrapper>
  )
}

export function PrivacyPage() {
  return (
    <PageWrapper title="Privacy Policy" icon={Shield}>
      <p>Last updated: May 2024</p>
      <h2 className="text-xl font-bold text-white">1. Information We Collect</h2>
      <p>We collect information you provide directly to us when you upload resumes or job descriptions. This includes text content, skills, and contact information extracted from your documents.</p>
      
      <h2 className="text-xl font-bold text-white">2. How We Use Information</h2>
      <p>We use the information to perform analysis, generate match scores, and improve our machine learning models. Your data is processed securely and is never sold to third parties.</p>

      <h2 className="text-xl font-bold text-white">3. Data Retention</h2>
      <p>By default, session data is stored temporarily. Registered users can choose to save their data for future reference or delete it permanently at any time from their profile settings.</p>
    </PageWrapper>
  )
}

export function TermsPage() {
  return (
    <PageWrapper title="Terms of Service" icon={FileText}>
      <h2 className="text-xl font-bold text-white">1. Acceptance of Terms</h2>
      <p>By accessing ResumeScanner, you agree to be bound by these terms. Our service is provided "as is" and we make no guarantees regarding the accuracy of AI-generated matching results.</p>
      
      <h2 className="text-xl font-bold text-white">2. User Responsibilities</h2>
      <p>Users are responsible for the accuracy of the documents they upload. You must not upload malicious files or attempt to circumvent our analysis limits.</p>

      <h2 className="text-xl font-bold text-white">3. Intellectual Property</h2>
      <p>The AI models, design, and software of ResumeScanner are the exclusive property of the platform. Users retain ownership of their uploaded content.</p>
    </PageWrapper>
  )
}

export function ContactPage() {
  return (
    <PageWrapper title="Contact Us" icon={Mail}>
      <p className="mb-6">Have questions or feedback? We'd love to hear from you. Our team typically responds within 24 hours.</p>
      
      <div className="space-y-6">
        <div className="flex items-start gap-4">
          <div className="h-10 w-10 rounded-lg bg-white/5 border border-white/10 flex items-center justify-center shrink-0">
            <Mail className="h-5 w-5 text-white" />
          </div>
          <div>
            <h3 className="font-bold text-white">Email Support</h3>
            <p className="text-sm">support@resumescanner.ai</p>
          </div>
        </div>

        <div className="flex items-start gap-4">
          <div className="h-10 w-10 rounded-lg bg-white/5 border border-white/10 flex items-center justify-center shrink-0">
            <Info className="h-5 w-5 text-white" />
          </div>
          <div>
            <h3 className="font-bold text-white">General Inquiries</h3>
            <p className="text-sm">hello@resumescanner.ai</p>
          </div>
        </div>
      </div>

      <div className="mt-8 pt-8 border-t border-white/10">
        <p className="text-sm italic opacity-60">Based in San Francisco, CA. Operating globally.</p>
      </div>
    </PageWrapper>
  )
}

export function DocsPage() {
  return (
    <PageWrapper title="Documentation" icon={BookOpen}>
      <h2 className="text-xl font-bold text-white">Getting Started</h2>
      <p>Learn how to get the most out of ResumeScanner's AI features.</p>
      
      <div className="space-y-4 mt-6">
        <details className="group border border-white/10 rounded-xl bg-white/5 overflow-hidden">
          <summary className="p-4 cursor-pointer font-bold text-white hover:bg-white/5 transition-colors list-none flex justify-between items-center">
            How the Match Score works
            <span className="group-open:rotate-180 transition-transform">▼</span>
          </summary>
          <div className="p-4 border-t border-white/10 text-sm">
            Our TF-IDF based ML model compares the semantic structure of your resume against the job description. It looks beyond keyword matching to understand context and hierarchy of skills.
          </div>
        </details>

        <details className="group border border-white/10 rounded-xl bg-white/5 overflow-hidden">
          <summary className="p-4 cursor-pointer font-bold text-white hover:bg-white/5 transition-colors list-none flex justify-between items-center">
            Optimizing for ATS
            <span className="group-open:rotate-180 transition-transform">▼</span>
          </summary>
          <div className="p-4 border-t border-white/10 text-sm">
            Applicant Tracking Systems often struggle with complex layouts. Use our "Resume Checker" tool to identify layout issues that might prevent your resume from being parsed correctly by corporate systems.
          </div>
        </details>
      </div>
    </PageWrapper>
  )
}
