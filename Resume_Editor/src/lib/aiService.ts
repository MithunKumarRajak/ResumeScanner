import type { ResumeData } from '../types/resume';

const ANTHROPIC_API_URL = 'https://api.anthropic.com/v1/messages';

async function callClaude(
  apiKey: string,
  prompt: string,
  onChunk?: (text: string) => void
): Promise<string> {
  if (!apiKey) throw new Error('No API key set. Please add your Claude API key in Settings.');

  const response = await fetch(ANTHROPIC_API_URL, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'x-api-key': apiKey,
      'anthropic-version': '2023-06-01',
      'anthropic-dangerous-direct-browser-access': 'true',
    },
    body: JSON.stringify({
      model: 'claude-sonnet-4-5',
      max_tokens: 1500,
      stream: !!onChunk,
      messages: [{ role: 'user', content: prompt }],
    }),
  });

  if (!response.ok) {
    const err = await response.json().catch(() => ({}));
    throw new Error((err as { error?: { message?: string } }).error?.message || `API error: ${response.status}`);
  }

  if (onChunk && response.body) {
    const reader = response.body.getReader();
    const decoder = new TextDecoder();
    let fullText = '';
    while (true) {
      const { done, value } = await reader.read();
      if (done) break;
      const chunk = decoder.decode(value);
      const lines = chunk.split('\n');
      for (const line of lines) {
        if (line.startsWith('data: ')) {
          try {
            const data = JSON.parse(line.slice(6));
            if (data.type === 'content_block_delta' && data.delta?.text) {
              fullText += data.delta.text;
              onChunk(data.delta.text);
            }
          } catch {}
        }
      }
    }
    return fullText;
  }

  const data = await response.json();
  return data.content?.[0]?.text ?? '';
}

export async function generateSummary(
  apiKey: string,
  role: string,
  skills: string[],
  onChunk?: (text: string) => void
): Promise<string> {
  const prompt = `You are an expert resume writer. Generate exactly 3 professional summary variants for a ${role} with skills in ${skills.join(', ')}.

Format your response as:
**Option 1:**
[summary here - 2-3 sentences, starts with a strong adjective, mentions key skills and years of experience if mentioned, ends with value proposition]

**Option 2:**
[different style summary - more achievement-focused]

**Option 3:**
[different style summary - more personality-forward]

Be concise, impactful, and use strong action words. Do not use "I" pronouns.`;
  return callClaude(apiKey, prompt, onChunk);
}

export async function improveBullets(
  apiKey: string,
  bullets: string,
  jobTitle: string,
  onChunk?: (text: string) => void
): Promise<string> {
  const prompt = `You are an expert resume coach. Rewrite these job description bullets for a ${jobTitle} role to be stronger, more impactful, and ATS-friendly.

Original bullets:
${bullets}

Rules:
- Start each bullet with a strong past-tense action verb (Led, Built, Engineered, Optimized, etc.)
- Add quantified metrics where possible (use [X]% or [$X] as placeholders if data is missing)
- Remove weak language like "responsible for", "helped with", "worked on"
- Keep each bullet to 1-2 lines maximum
- Format with "- " prefix

Return ONLY the improved bullets, nothing else.`;
  return callClaude(apiKey, prompt, onChunk);
}

export async function tailorToJobDescription(
  apiKey: string,
  resumeData: ResumeData,
  jobDescription: string,
  onChunk?: (text: string) => void
): Promise<string> {
  const skillsList = resumeData.skills.map((s) => s.name).join(', ');
  const expSummary = resumeData.experience
    .slice(0, 2)
    .map((e) => `${e.title} at ${e.company}`)
    .join('; ');

  const prompt = `You are an expert recruiter and resume writer. Analyze this job description and provide specific recommendations to tailor the resume.

Resume Summary: "${resumeData.summary}"
Current Skills: ${skillsList}
Experience: ${expSummary}

Job Description:
${jobDescription.slice(0, 2000)}

Provide:
1. **Keywords to Add** (list 5-10 keywords from JD not in resume)
2. **Summary Rewrite** (rewrite the summary to match JD tone and keywords)
3. **Skills to Highlight** (which current skills are most relevant)
4. **Experience Bullets to Emphasize** (suggest 3 bullet improvements)
5. **Overall Match Score** (X/10 with brief reason)`;
  return callClaude(apiKey, prompt, onChunk);
}

export async function checkATSScore(
  apiKey: string,
  resumeData: ResumeData,
  jobDescription: string,
  onChunk?: (text: string) => void
): Promise<string> {
  const resumeText = [
    resumeData.summary,
    resumeData.experience.map((e) => `${e.title} ${e.company} ${e.description}`).join(' '),
    resumeData.skills.map((s) => s.name).join(' '),
    resumeData.projects.map((p) => `${p.title} ${p.description}`).join(' '),
  ]
    .join(' ')
    .slice(0, 3000);

  const prompt = `You are an ATS (Applicant Tracking System) analyzer. Analyze this resume against the job description.

Resume Content:
${resumeText}

Job Description:
${jobDescription.slice(0, 1500)}

Return a structured analysis:
**ATS Score: XX%**

**✅ Matched Keywords:**
[list matched keywords]

**❌ Missing Keywords:**
[list important missing keywords from JD]

**📊 Section Analysis:**
- Summary: [score/10]
- Skills match: [score/10]
- Experience relevance: [score/10]

**🎯 Top 3 Improvements:**
1. [specific action]
2. [specific action]
3. [specific action]`;
  return callClaude(apiKey, prompt, onChunk);
}

export async function analyzeSkillGap(
  apiKey: string,
  currentSkills: string[],
  jobDescription: string,
  onChunk?: (text: string) => void
): Promise<string> {
  const prompt = `Analyze the skill gap between a candidate's current skills and a job description.

Current Skills: ${currentSkills.join(', ')}

Job Description:
${jobDescription.slice(0, 1500)}

Provide:
**Skills You Already Have ✅**
[matching skills]

**Critical Missing Skills 🔴** (required in JD)
[list with learning resources or courses]

**Nice-to-Have Missing Skills 🟡** (mentioned but not critical)
[list]

**Learning Roadmap:**
[3-month plan to close the gap]`;
  return callClaude(apiKey, prompt, onChunk);
}

export async function checkGrammar(
  apiKey: string,
  text: string,
  onChunk?: (text: string) => void
): Promise<string> {
  const prompt = `You are a professional editor. Review this resume text for grammar, clarity, passive voice, and vague language.

Text to review:
${text.slice(0, 2000)}

Provide:
**Issues Found:**
[list each issue with line/phrase and suggested fix]

**Passive Voice Instances:**
[list and rewrite as active]

**Vague Language:**
[list and suggest specifics]

**Overall Clarity Score: X/10**

**Improved Version:**
[rewrite the full text with all corrections]`;
  return callClaude(apiKey, prompt, onChunk);
}

export async function generateCoverLetter(
  apiKey: string,
  resumeData: ResumeData,
  jobDescription: string,
  companyName: string,
  onChunk?: (text: string) => void
): Promise<string> {
  const prompt = `Write a compelling, tailored cover letter for this candidate applying to ${companyName}.

Candidate:
- Name: ${resumeData.personalInfo.fullName}
- Title: ${resumeData.personalInfo.title}
- Summary: ${resumeData.summary}
- Top Skills: ${resumeData.skills
    .slice(0, 6)
    .map((s) => s.name)
    .join(', ')}
- Recent Role: ${resumeData.experience[0]?.title} at ${resumeData.experience[0]?.company}

Job Description:
${jobDescription.slice(0, 1200)}

Write a 3-paragraph cover letter that:
1. Opens with a strong hook mentioning the specific role
2. Highlights 2-3 most relevant achievements with specifics
3. Closes with enthusiasm and a clear call to action

Tone: Professional yet personable. Do not use "I am writing to express my interest."`;
  return callClaude(apiKey, prompt, onChunk);
}

export async function suggestAchievements(
  apiKey: string,
  jobTitle: string,
  industry: string,
  onChunk?: (text: string) => void
): Promise<string> {
  const prompt = `Generate 8 quantifiable achievement bullet points for a ${jobTitle} in the ${industry} industry.

Format each as:
- [Strong Action Verb] [specific achievement] resulting in [XY% measurable outcome]

Make them realistic, varied (cost savings, revenue, efficiency, team, product), and use placeholders like [X]% for specific numbers. Focus on outcomes, not tasks.`;
  return callClaude(apiKey, prompt, onChunk);
}

export async function rewriteTone(
  apiKey: string,
  text: string,
  tone: 'formal' | 'conversational' | 'confident',
  onChunk?: (text: string) => void
): Promise<string> {
  const toneDescriptions = {
    formal: 'highly professional, traditional corporate language, third-person perspective where applicable',
    conversational: 'warm, approachable, first-person but still professional, like talking to a colleague',
    confident: 'bold, direct, achievement-focused, strong verbs, no hedging language',
  };

  const prompt = `Rewrite this resume text in a ${tone} tone (${toneDescriptions[tone]}).

Original text:
${text.slice(0, 2000)}

Provide only the rewritten version, maintaining all facts but adjusting the tone completely.`;
  return callClaude(apiKey, prompt, onChunk);
}

export async function generateInterviewQuestions(
  apiKey: string,
  resumeData: ResumeData,
  onChunk?: (text: string) => void
): Promise<string> {
  const expSummary = resumeData.experience
    .map((e) => `${e.title} at ${e.company}: ${e.description.slice(0, 200)}`)
    .join('\n');

  const prompt = `Based on this resume, generate 12 likely interview questions a hiring manager would ask, with brief answer guidance.

Role: ${resumeData.personalInfo.title}
Experience:
${expSummary.slice(0, 1000)}
Skills: ${resumeData.skills.map((s) => s.name).join(', ')}

Generate:
- 3 behavioral questions (STAR format)
- 3 technical questions based on their skills  
- 3 situational questions based on their experience
- 3 role-specific questions

Format each as:
**Q: [Question]**
💡 Answer tip: [1-2 sentence guidance]`;
  return callClaude(apiKey, prompt, onChunk);
}

export async function parseResumeText(
  apiKey: string,
  text: string,
  onChunk?: (text: string) => void
): Promise<ResumeData> {
  const prompt = `You are an expert resume parser. Extract information from the following raw resume text and format it into a valid JSON object matching this structure:
{
  "personalInfo": { "fullName": "", "title": "", "email": "", "phone": "", "location": "", "linkedin": "", "github": "", "portfolio": "" },
  "summary": "",
  "experience": [{ "id": "1", "company": "", "title": "", "startDate": "", "endDate": "", "location": "", "remote": false, "description": "" }],
  "education": [{ "id": "1", "degree": "", "institution": "", "fieldOfStudy": "", "graduationYear": "" }],
  "skills": [{ "id": "1", "name": "", "category": "Technical" }],
  "projects": [{ "id": "1", "title": "", "techStack": [], "description": "" }],
  "certifications": [{ "id": "1", "name": "", "issuer": "", "date": "" }],
  "languages": [{ "id": "1", "language": "", "proficiency": "Fluent" }]
}

Text:
${text}

Rules:
1. Return ONLY the JSON object.
2. If a field is missing, return empty string or empty array.
3. Generate unique IDs for list items.
4. Categorize skills as "Technical", "Soft", or "Tools".`;

  const result = await callClaude(apiKey, prompt, onChunk);
  try {
    // Attempt to extract JSON if Claude adds any conversational text
    const jsonMatch = result.match(/\{[\s\S]*\}/);
    return JSON.parse(jsonMatch ? jsonMatch[0] : result);
  } catch (err) {
    console.error('Failed to parse Claude JSON:', err);
    throw new Error('Claude returned invalid data format. Please try again.');
  }
}

export async function enhanceSection(
  apiKey: string,
  sectionType: string,
  content: string,
  onChunk?: (text: string) => void
): Promise<string> {
  const prompt = `You are a professional resume writer. Enhance the following "${sectionType}" content to be more impactful, professional, and ATS-friendly.

Content:
${content}

Rules:
- Use strong action verbs.
- Fix grammar and tone.
- Suggest better keywords.
- Keep the length similar unless specified.
- Return ONLY the enhanced version.`;

  return callClaude(apiKey, prompt, onChunk);
}

/**
 * Analyzes resume data against a job description to provide an ATS score and suggestions.
 */
export async function calculateATSScore(
  apiKey: string,
  resumeData: any,
  jobDescription: string
): Promise<{
  score: number;
  matchingSkills: string[];
  missingSkills: string[];
  suggestions: string[];
  roleMatch: string;
}> {
  const prompt = `
    Compare the following resume data against the job description provided.
    Provide an ATS (Applicant Tracking System) compatibility analysis.
    
    [RESUME DATA]
    ${JSON.stringify(resumeData, null, 2)}
    
    [JOB DESCRIPTION]
    ${jobDescription}
    
    Return ONLY a JSON object (no markdown, no extra text) with this structure:
    {
      "score": number (0-100),
      "matchingSkills": string[],
      "missingSkills": string[],
      "suggestions": string[],
      "roleMatch": string (Short summary of how well the resume matches the specific role)
    }
  `;

  const response = await callClaude(apiKey, prompt);
  try {
    const jsonMatch = response.match(/\{[\s\S]*\}/);
    if (!jsonMatch) throw new Error("Invalid AI response");
    return JSON.parse(jsonMatch[0]);
  } catch (err) {
    console.error("Failed to parse ATS score:", err);
    throw new Error("Failed to calculate ATS score. Please try again.");
  }
}
