import { ScanLine, Github, Twitter, Linkedin } from 'lucide-react'
import { Link } from 'react-router-dom'

export default function Footer() {
  const currentYear = new Date().getFullYear()

  const footerLinks = [
    { label: 'About', href: '/about' },
    { label: 'Privacy', href: '/privacy' },
    { label: 'Terms', href: '/terms' },
    { label: 'Contact', href: '/contact' },
    { label: 'Docs', href: '/docs' },
  ]

  const socialLinks = [
    { icon: Github,   href: '#', label: 'GitHub'   },
    { icon: Twitter,  href: '#', label: 'Twitter'  },
    { icon: Linkedin, href: '#', label: 'LinkedIn' },
  ]

  return (
    <footer className="relative mt-auto" style={{ background: 'rgba(17,17,24,0.9)' }}>
      {/* Gradient top border — not flat line */}
      <div className="absolute top-0 left-0 right-0 h-px bg-gradient-to-r from-transparent via-[rgba(45,212,168,0.2)] to-transparent" />

      <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
        {/* Main footer — left-aligned brand, right-aligned links (breaks centered symmetry) */}
        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-6 py-10">
          {/* Brand — left aligned */}
          <div className="space-y-3">
            <div className="flex items-center gap-2.5">
              <div className="relative flex h-8 w-8 items-center justify-center rounded-lg gradient-border" style={{ background: 'rgba(26,26,34,0.9)' }}>
                <ScanLine className="h-4 w-4 text-[#2dd4a8]" />
              </div>
              <span className="text-sm font-bold text-[#f0f0f5] tracking-tight font-display">
                Resume<span className="gradient-text">Scanner</span>
              </span>
            </div>
            <p className="text-xs text-[#5e5e72] max-w-xs leading-relaxed">
              ML-powered resume screening and optimization for candidates and recruiters.
            </p>
          </div>

          {/* Links + Socials — right side */}
          <div className="flex flex-col items-start sm:items-end gap-4">
            <div className="flex flex-wrap items-center gap-x-5 gap-y-2">
              {footerLinks.map((link) => (
                <Link
                  key={link.label}
                  to={link.href}
                  className="text-xs font-medium text-[#5e5e72] hover:text-[#2dd4a8] transition-colors"
                >
                  {link.label}
                </Link>
              ))}
            </div>

            {/* Socials — slightly larger with hover lift */}
            <div className="flex items-center gap-2">
              {socialLinks.map(({ icon: Icon, href, label }) => (
                <a
                  key={label}
                  href={href}
                  aria-label={label}
                  className="flex h-9 w-9 items-center justify-center rounded-lg border border-[rgba(255,255,255,0.06)] text-[#5e5e72] hover:text-[#2dd4a8] hover:border-[rgba(45,212,168,0.2)] hover:-translate-y-0.5 transition-all"
                >
                  <Icon className="h-4 w-4" />
                </a>
              ))}
            </div>
          </div>
        </div>

        {/* Copyright — clean, no "Made with ❤️" */}
        <div className="border-t border-[rgba(255,255,255,0.04)] py-5">
          <p className="text-[11px] text-[#3e3e4e]">
            © {currentYear} ResumeScanner. All rights reserved.
          </p>
        </div>
      </div>
    </footer>
  )
}
