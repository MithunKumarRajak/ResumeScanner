/**
 * SecurityBadge.jsx — Read-only status badges for the agentic security pipeline.
 *
 * PURPOSE:
 *   Displays the results of the backend's security scan and PII redaction
 *   as compact, colour-coded badges. These are purely informational — there
 *   is no interactive toggle (the security controls always run server-side).
 *
 * PROPS:
 *   scanPassed         {boolean|null} — true=passed, false=failed, null=not run yet
 *   scanReason         {string|null}  — rejection reason (only shown if failed)
 *   piiRedactionCount  {number|null}  — how many PII items were redacted
 *   piiTypesFound      {string[]}     — list of PII type names (email, phone, etc.)
 *
 * DESIGN NOTE:
 *   These badges convey security posture without alarming non-technical users.
 *   Green = all good. Amber = partial info (scan not run yet). Red = rejected.
 */

import { ShieldCheck, ShieldX, ShieldAlert, Lock } from 'lucide-react'

export default function SecurityBadge({
  scanPassed = null,
  scanReason = null,
  piiRedactionCount = null,
  piiTypesFound = [],
}) {
  // Don't render anything if we have no security data at all.
  if (scanPassed === null && piiRedactionCount === null) return null

  return (
    <div className="flex flex-wrap gap-2 mt-2">
      {/* --- File Scan Badge --- */}
      {scanPassed === true && (
        <span
          title="Magic-byte security scan passed — file type verified"
          className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-medium
                     bg-emerald-500/15 text-emerald-400 border border-emerald-500/30 select-none"
        >
          <ShieldCheck size={12} strokeWidth={2.5} />
          File scan passed ✓
        </span>
      )}
      {scanPassed === false && (
        <span
          title={scanReason || 'Security scan failed'}
          className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-medium
                     bg-red-500/15 text-red-400 border border-red-500/30 select-none"
        >
          <ShieldX size={12} strokeWidth={2.5} />
          Scan failed ✗
        </span>
      )}
      {scanPassed === null && (
        <span
          title="Security scan result not yet available"
          className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-medium
                     bg-amber-500/15 text-amber-400 border border-amber-500/30 select-none"
        >
          <ShieldAlert size={12} strokeWidth={2.5} />
          Scan pending…
        </span>
      )}

      {/* --- PII Redaction Badge --- */}
      {piiRedactionCount !== null && (
        <span
          title={
            piiRedactionCount > 0
              ? `${piiRedactionCount} PII item(s) redacted before sending to AI: ${(piiTypesFound || []).join(', ')}`
              : 'No PII detected in text sent to AI'
          }
          className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-medium
                     bg-blue-500/15 text-blue-400 border border-blue-500/30 select-none"
        >
          <Lock size={12} strokeWidth={2.5} />
          {piiRedactionCount > 0
            ? `${piiRedactionCount} PII field${piiRedactionCount !== 1 ? 's' : ''} redacted ✓`
            : 'No PII detected ✓'}
        </span>
      )}
    </div>
  )
}
