import { ScanLine, Github, Twitter, Linkedin, Heart } from 'lucide-react'

export default function Footer() {
  const currentYear = new Date().getFullYear()

  const footerLinks = [
    { label: 'About', href: '#' },
    { label: 'Privacy', href: '#' },
    { label: 'Terms', href: '#' },
    { label: 'Contact', href: '#' },
    { label: 'Documentation', href: '#' },
  ]

  const socialLinks = [
    { icon: Github,   href: '#', label: 'GitHub'   },
    { icon: Twitter,  href: '#', label: 'Twitter'  },
    { icon: Linkedin, href: '#', label: 'LinkedIn' },
  ]

  return (
    <footer className="border-t border-slate-800/60 bg-[rgba(10,15,30,0.85)] backdrop-blur-md mt-auto">
      <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">

        {/* Main footer */}
        <div className="flex flex-col sm:flex-row items-center justify-between gap-6 py-8">
          {/* Brand */}
          <div className="flex items-center gap-2.5">
            <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-gradient-to-br from-indigo-500 to-violet-600 text-white">
              <ScanLine className="h-4 w-4" />
            </div>
            <span className="text-sm font-bold text-white tracking-tight">
              Resume<span className="gradient-text">Scanner</span>
            </span>
          </div>

          {/* Links */}
          <div className="flex flex-wrap items-center justify-center gap-x-6 gap-y-2">
            {footerLinks.map((link) => (
              <a
                key={link.label}
                href={link.href}
                className="text-xs font-medium text-slate-500 hover:text-slate-300 transition-colors"
              >
                {link.label}
              </a>
            ))}
          </div>

          {/* Socials */}
          <div className="flex items-center gap-2">
            {socialLinks.map(({ icon: Icon, href, label }) => (
              <a
                key={label}
                href={href}
                aria-label={label}
                className="flex h-8 w-8 items-center justify-center rounded-lg border border-slate-700/50 text-slate-500 hover:text-slate-200 hover:border-slate-600 hover:bg-slate-800/40 transition-all"
              >
                <Icon className="h-3.5 w-3.5" />
              </a>
            ))}
          </div>
        </div>

        {/* Copyright */}
        <div className="border-t border-slate-800/40 py-5 flex flex-col sm:flex-row items-center justify-between gap-2">
          <p className="text-xs text-slate-600">
            © {currentYear} ResumeScanner. All rights reserved.
          </p>
          <p className="flex items-center gap-1 text-xs text-slate-600">
            Made with <Heart className="h-3 w-3 fill-red-500/60 text-red-500/60" /> for better hiring
          </p>
        </div>
      </div>
    </footer>
  )
}
