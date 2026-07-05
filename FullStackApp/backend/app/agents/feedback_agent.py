"""
app/agents/feedback_agent.py — FeedbackAgent (second LLM agent in the multi-agent system).

===========================================================================
ROLE IN THE MULTI-AGENT SYSTEM:
===========================================================================
  Agent 1 — SecurityOrchestratorAgent (orchestrator.py):
    Responsibility: security, PII protection, and ML classification.
    Decides: is this resume safe? Is it scoreable? What category?

  Agent 2 — FeedbackAgent (this file):
    Responsibility: candidate improvement and recruiter insight.
    Decides: what are the top skill gaps? How can this resume score higher?
             What specific changes would improve ATS pass rate?

  The two agents are COORDINATED by the orchestrator, which calls the
  FeedbackAgent AFTER scoring completes. This is the ADK multi-agent
  pattern: specialized sub-agents, each with a narrow scope.

===========================================================================
DESIGN — WHY THIS IS AN AGENT (not just a function):
===========================================================================
  The FeedbackAgent uses LLM reasoning to:
    1. Interpret the ML score (e.g., "87% Data Science") in the context
       of the resume's actual content — a function cannot do this.
    2. Identify the most impactful missing skills from a dynamic JD —
       no static rule set covers all job descriptions.
    3. Prioritize which improvements will have the highest ATS impact —
       this requires contextual judgment about recruiter behavior.

  A static function would just return a template. The LLM can reason
  about WHY a specific resume is scoring the way it does and return
  advice that is unique to that candidate.

===========================================================================
TOOL USED:
===========================================================================
  This agent does NOT call external tools itself. It receives the score
  result (already computed by the SecurityOrchestratorAgent) and uses
  LLM reasoning to interpret and expand it. This keeps the agents loosely
  coupled — neither agent depends on the other's internal implementation.

===========================================================================
REDACTION SCOPE (same policy as orchestrator.py):
===========================================================================
  - Only REDACTED resume text is ever sent to external LLMs (Gemini/Groq).
  - The JD text is generated internally and contains no PII.
  - Feedback output (improvement tips) is structurally safe — it is about
    skills and formatting, not about PII.
"""

import json
import logging
from typing import Optional

logger = logging.getLogger(__name__)



# FeedbackAgent — structured resume improvement reasoning


class FeedbackAgent:
    """
    An LLM-driven agent that generates structured, actionable resume feedback.

    Receives the ML classification result from the SecurityOrchestratorAgent
    and the redacted resume text, then uses LLM reasoning to produce:
      - Top skill gaps (vs. the predicted job category)
      - Prioritised improvement suggestions (ATS-focused)
      - Estimated ATS score impact per suggestion
      - One-line executive summary for recruiters

    This agent is the second step in the multi-agent pipeline. It is
    always called AFTER the SecurityOrchestratorAgent completes scoring.
    """

    # System context for the LLM agent
    _SYSTEM_PROMPT = (
        "You are an expert resume coach and ATS optimization specialist with "
        "10+ years of experience in technical recruiting. Your job is to provide "
        "concise, actionable, evidence-based feedback to help candidates improve "
        "their resumes for specific job categories. Always ground your suggestions "
        "in the actual resume content provided — never invent facts."
    )

    def run(
        self,
        redacted_resume_text: str,
        score_result: dict,
        job_description: Optional[str] = None,
        db_session=None,
        resume_id: Optional[str] = None,
    ) -> dict:
        """
        Run the FeedbackAgent reasoning loop.

        Args:
            redacted_resume_text: PII-redacted resume text (safe for LLM).
            score_result: Output from SecurityOrchestratorAgent's score_resume tool.
                          Expected keys: predicted_category, confidence, scoreable.
            job_description: Optional JD text for targeted gap analysis.
            db_session: SQLAlchemy session for audit logging (None = console only).
            resume_id: FK for audit_log rows (None if not yet persisted).

        Returns:
            {
                "skill_gaps":        list[str]   — Top skill gaps identified
                "improvements":      list[dict]  — Prioritised improvement actions
                    each improvement: {
                        "action": str,           — What to do
                        "impact": str,           — "High" | "Medium" | "Low"
                        "ats_score_boost": int   — Estimated +pts to ATS score
                    }
                "ats_summary":       str         — One-line recruiter-facing summary
                "category_fit":      str         — "Strong" | "Good" | "Moderate" | "Weak"
                "agent_used_llm":    bool        — True if LLM was available
                "error":             str|None    — Set if agent encountered an error
            }
        """
        predicted_category = score_result.get("predicted_category", "Unknown")
        confidence = score_result.get("confidence", 0.0)
        scoreable = score_result.get("scoreable", True)

        # If the resume wasn't scoreable, we can't give meaningful feedback.
        if not scoreable:
            reason = score_result.get("not_scoreable_reason", "unknown")
            logger.warning("[FeedbackAgent] Resume not scoreable — skipping feedback: %s", reason)
            return self._fallback_result(
                category=predicted_category,
                reason=f"Resume not scoreable: {reason}",
                used_llm=False,
            )

        # Build the agent prompt with score context and redacted resume.
        prompt = self._build_prompt(
            redacted_text=redacted_resume_text,
            predicted_category=predicted_category,
            confidence=confidence,
            job_description=job_description,
        )

        # Try Gemini → Groq → deterministic fallback
        llm_response = self._call_llm(prompt)

        # Parse the LLM response into structured feedback.
        feedback = self._parse_response(llm_response, predicted_category, confidence)

        # Log this agent's step to the audit trail.
        self._log_audit(
            db_session=db_session,
            resume_id=resume_id,
            feedback=feedback,
            used_llm=llm_response is not None,
        )

        return feedback

    # -----------------------------------------------------------------------
    # Private: prompt builder
    # -----------------------------------------------------------------------

    def _build_prompt(
        self,
        redacted_text: str,
        predicted_category: str,
        confidence: float,
        job_description: Optional[str],
    ) -> str:
        """
        Build the structured agent prompt.

        The LLM receives:
          - The ML model's prediction and confidence (context for reasoning)
          - The PII-redacted resume text (safe for external APIs)
          - The optional job description (for targeted gap analysis)

        The LLM must return a valid JSON object.
        """
        jd_block = ""
        if job_description and job_description.strip():
            jd_block = f"""
Target Job Description (use this for targeted skill gap analysis):
\"\"\"
{job_description[:2000]}
\"\"\"
"""
        else:
            jd_block = f"""
No specific job description provided.
Use the predicted category "{predicted_category}" as the target role.
Identify the top skills typically expected for this category.
"""

        return f"""{self._SYSTEM_PROMPT}

You are analyzing a resume that an ML model has classified as follows:
  - Predicted Category: {predicted_category}
  - Confidence: {confidence:.1%}

{jd_block}

Resume text (PII has been redacted for privacy — [REDACTED_EMAIL], [REDACTED_PHONE] are placeholders):
\"\"\"
{redacted_text[:4000]}
\"\"\"

Your task:
1. Identify the TOP 3-5 skill gaps between this resume and the target role/category.
2. For each gap, suggest a specific, actionable improvement the candidate can make.
3. Estimate the ATS score boost (0-20 points) each improvement would provide.
4. Write a one-line executive summary a recruiter would see.
5. Rate overall category fit: "Strong" (>80% confidence), "Good" (60-80%), "Moderate" (40-60%), or "Weak" (<40%).

Return ONLY valid JSON in this exact format (no markdown, no extra text):
{{
  "skill_gaps": ["gap1", "gap2", "gap3"],
  "improvements": [
    {{
      "action": "specific action the candidate should take",
      "impact": "High",
      "ats_score_boost": 12
    }}
  ],
  "ats_summary": "One-line summary for recruiter view",
  "category_fit": "Strong"
}}
"""

    # -----------------------------------------------------------------------
    # Private: LLM calls (Gemini first, Groq fallback)
    # -----------------------------------------------------------------------

    def _call_llm(self, prompt: str) -> Optional[str]:
        """Try Gemini, then Groq. Returns raw LLM text or None."""
        # --- Try Gemini ---
        try:
            from app.routes.ai import _get_gemini
            model = _get_gemini()
            if model is not None:
                response = model.generate_content(prompt)
                text = response.text.strip()
                logger.info("[FeedbackAgent] Gemini responded (%d chars)", len(text))
                return text
        except Exception as exc:
            logger.warning("[FeedbackAgent] Gemini call failed: %s", exc)

        # --- Try Groq fallback ---
        try:
            from app.routes.ai import _call_groq_api
            text = _call_groq_api(prompt)
            if text:
                logger.info("[FeedbackAgent] Groq responded (%d chars)", len(text))
                return text
        except Exception as exc:
            logger.warning("[FeedbackAgent] Groq call failed: %s", exc)

        logger.warning("[FeedbackAgent] All LLM providers unavailable — using fallback")
        return None

    # -----------------------------------------------------------------------
    # Private: response parser
    # -----------------------------------------------------------------------

    def _parse_response(
        self,
        llm_text: Optional[str],
        predicted_category: str,
        confidence: float,
    ) -> dict:
        """
        Parse the LLM JSON response into a validated feedback dict.

        Falls back to a deterministic (non-LLM) result if:
          - LLM was unavailable
          - LLM returned malformed JSON
          - LLM response doesn't have expected keys
        """
        if llm_text:
            try:
                # Strip markdown code fences if present.
                clean = llm_text.strip()
                if clean.startswith("```"):
                    # Remove opening fence line
                    clean = clean.split("\n", 1)[1] if "\n" in clean else clean[3:]
                if clean.endswith("```"):
                    clean = clean[:-3].strip()
                if clean.startswith("json"):
                    clean = clean[4:].strip()

                parsed = json.loads(clean)

                # Validate structure — all keys must be present.
                required_keys = ["skill_gaps", "improvements", "ats_summary", "category_fit"]
                if all(k in parsed for k in required_keys):
                    parsed["agent_used_llm"] = True
                    parsed["error"] = None
                    logger.info(
                        "[FeedbackAgent] Parsed %d skill gaps, %d improvements",
                        len(parsed.get("skill_gaps", [])),
                        len(parsed.get("improvements", [])),
                    )
                    return parsed
                else:
                    missing = [k for k in required_keys if k not in parsed]
                    logger.warning("[FeedbackAgent] LLM response missing keys: %s", missing)
            except Exception as exc:
                logger.warning("[FeedbackAgent] Could not parse LLM JSON: %s", exc)

        # Deterministic fallback based on confidence tier.
        return self._fallback_result(category=predicted_category, confidence=confidence, used_llm=False)

    # -----------------------------------------------------------------------
    # Private: deterministic fallback (no LLM needed)
    # -----------------------------------------------------------------------

    def _fallback_result(
        self,
        category: str,
        confidence: float = 0.0,
        reason: Optional[str] = None,
        used_llm: bool = False,
    ) -> dict:
        """
        Return a deterministic feedback result when LLM is unavailable.

        This ensures the pipeline always returns a useful result, even
        without an API key — the ML score is still accurate, and the
        fallback provides generic but valid advice.
        """
        # Determine category fit tier from confidence.
        if confidence >= 0.80:
            category_fit = "Strong"
            base_improvements = [
                {
                    "action": f"Add 2-3 quantified achievements specific to {category} projects (e.g., 'reduced processing time by 30%').",
                    "impact": "High",
                    "ats_score_boost": 15,
                },
                {
                    "action": "Include a concise professional summary (3-4 lines) at the top mentioning your specialization.",
                    "impact": "Medium",
                    "ats_score_boost": 8,
                },
                {
                    "action": "List technical skills in a dedicated section using comma-separated keywords (not paragraphs).",
                    "impact": "Medium",
                    "ats_score_boost": 6,
                },
            ]
        elif confidence >= 0.60:
            category_fit = "Good"
            base_improvements = [
                {
                    "action": f"Strengthen alignment to {category} by mirroring exact keywords from the target job description.",
                    "impact": "High",
                    "ats_score_boost": 18,
                },
                {
                    "action": "Add relevant certifications or courses to signal domain commitment.",
                    "impact": "Medium",
                    "ats_score_boost": 10,
                },
                {
                    "action": "Use action verbs (Led, Designed, Built, Optimized) at the start of each bullet point.",
                    "impact": "Medium",
                    "ats_score_boost": 7,
                },
            ]
        elif confidence >= 0.40:
            category_fit = "Moderate"
            base_improvements = [
                {
                    "action": f"Reframe your experience narrative to emphasize transferable skills relevant to {category}.",
                    "impact": "High",
                    "ats_score_boost": 20,
                },
                {
                    "action": "Add a 'Key Projects' section showcasing 2-3 projects most relevant to the target role.",
                    "impact": "High",
                    "ats_score_boost": 16,
                },
                {
                    "action": "Remove or de-emphasize experience sections unrelated to the target role.",
                    "impact": "Medium",
                    "ats_score_boost": 9,
                },
            ]
        else:
            category_fit = "Weak"
            base_improvements = [
                {
                    "action": f"Consider targeting roles in your current strongest domain before pivoting to {category}.",
                    "impact": "High",
                    "ats_score_boost": 0,
                },
                {
                    "action": f"Enroll in 1-2 foundational courses for {category} and add them to your Education section.",
                    "impact": "High",
                    "ats_score_boost": 12,
                },
                {
                    "action": "Build a portfolio project demonstrating domain-relevant skills and link it on your resume.",
                    "impact": "High",
                    "ats_score_boost": 15,
                },
            ]

        return {
            "skill_gaps": [
                f"Insufficient {category}-specific technical keywords",
                "Missing quantified impact metrics",
                "Weak professional summary or none present",
            ],
            "improvements": base_improvements,
            "ats_summary": (
                f"Resume classified as {category} with {confidence:.0%} confidence ({category_fit} fit). "
                f"{'LLM feedback unavailable — showing rule-based suggestions.' if not used_llm else ''}"
            ).strip(),
            "category_fit": category_fit,
            "agent_used_llm": used_llm,
            "error": reason,
        }

    # -----------------------------------------------------------------------
    # Private: audit logging
    # -----------------------------------------------------------------------

    def _log_audit(
        self,
        db_session,
        resume_id: Optional[str],
        feedback: dict,
        used_llm: bool,
    ) -> None:
        """Write one row to the audit_log table for the feedback step."""
        try:
            from app.tools.audit_logger import log_step
            n_gaps = len(feedback.get("skill_gaps", []))
            n_improvements = len(feedback.get("improvements", []))
            category_fit = feedback.get("category_fit", "unknown")
            log_step(
                db_session=db_session,
                step_name="feedback",
                status="passed" if not feedback.get("error") else "error",
                detail=(
                    f"FeedbackAgent: {n_gaps} skill gaps, {n_improvements} improvements, "
                    f"category_fit={category_fit}, used_llm={used_llm}"
                ),
                resume_id=resume_id,
            )
        except Exception as exc:
            # Audit failure must never break the main pipeline.
            logger.error("[FeedbackAgent] Audit log failed (non-fatal): %s", exc)



# Module-level singleton — callers import and call run() directly.
# This avoids constructing a new FeedbackAgent on every request.


_feedback_agent = FeedbackAgent()


def run_feedback_agent(
    redacted_resume_text: str,
    score_result: dict,
    job_description: Optional[str] = None,
    db_session=None,
    resume_id: Optional[str] = None,
) -> dict:
    """
    Public entry point for the FeedbackAgent.

    This is the function called by the SecurityOrchestratorAgent after
    run_security_pipeline() completes. It keeps the two agents decoupled
    — the orchestrator only needs this one import, not the class internals.

    Args:
        redacted_resume_text: PII-redacted resume text (safe for external LLMs).
        score_result: Dict returned by the score_resume tool in orchestrator.py.
        job_description: Optional JD for targeted gap analysis.
        db_session: SQLAlchemy session for audit logging.
        resume_id: FK for audit_log rows.

    Returns:
        Structured feedback dict (see FeedbackAgent.run() docstring).
    """
    return _feedback_agent.run(
        redacted_resume_text=redacted_resume_text,
        score_result=score_result,
        job_description=job_description,
        db_session=db_session,
        resume_id=resume_id,
    )
