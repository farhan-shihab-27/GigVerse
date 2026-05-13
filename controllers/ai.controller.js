// ── AI-Powered Smart Pricing & Gig Estimator Controller ─────────────────────
// Uses Google Gemini API to analyze a project description and return
// category, skill tags, and estimated price range for the UIU campus market.
const { GoogleGenerativeAI } = require('@google/generative-ai');

const GEMINI_API_KEY = process.env.GEMINI_API_KEY;

// System prompt engineered for structured JSON output
const SYSTEM_PROMPT = `You are GigVerse AI — a smart pricing engine for a university campus freelance marketplace (UIU — United International University, Bangladesh).

Given a user's project description, analyze it and return a JSON object with EXACTLY these fields:
1. "SuggestedCategory" — ONE of: "Design", "Development", "Writing", "Marketing", "Tutoring"
2. "SkillTags" — an array of 3–6 relevant skill tags (e.g., ["React", "Node.js", "MongoDB"])
3. "EstimatedBasePrice" — a price RANGE string in USD suitable for campus-level work (e.g., "$15 - $25", "$30 - $50")

Rules:
- Prices should be realistic for university student freelancers (typically $5 – $100 range).
- Skill tags should be specific technologies or skills, not vague terms.
- Always return valid JSON. No markdown, no code fences, no extra text.
- If the prompt is too vague, still make your best estimate and return valid JSON.

Example input: "I need a React e-commerce site with payment integration"
Example output: {"SuggestedCategory":"Development","SkillTags":["React","Node.js","Stripe","Tailwind CSS","REST API"],"EstimatedBasePrice":"$25 - $45"}`;

/**
 * POST /api/ai/estimate
 * Body: { prompt: string }
 * Returns: { success, data: { SuggestedCategory, SkillTags, EstimatedBasePrice } }
 */
exports.estimateGig = async (req, res, next) => {
  try {
    const { prompt } = req.body;

    if (!prompt || typeof prompt !== 'string' || prompt.trim().length < 5) {
      return res.status(400).json({
        success: false,
        message: 'Please provide a project description (at least 5 characters).',
      });
    }

    // ── Guard: API key not configured ──
    if (!GEMINI_API_KEY) {
      console.warn('[AI Controller] GEMINI_API_KEY is not set in environment variables.');
      return res.status(503).json({
        success: false,
        message: 'AI service is not configured. Please contact the administrator.',
      });
    }

    // ── Call Gemini API ──
    const genAI  = new GoogleGenerativeAI(GEMINI_API_KEY);
    const model  = genAI.getGenerativeModel({ model: 'gemini-2.0-flash' });

    const result = await model.generateContent({
      contents: [
        { role: 'user', parts: [{ text: `${SYSTEM_PROMPT}\n\nUser request: "${prompt.trim()}"` }] },
      ],
      generationConfig: {
        temperature: 0.4,
        maxOutputTokens: 300,
        responseMimeType: 'application/json',
      },
    });

    const responseText = result.response.text().trim();

    // ── Parse the JSON response ──
    let parsed;
    try {
      // Strip markdown code fences if the model wraps them
      const cleaned = responseText.replace(/```json\s*/gi, '').replace(/```\s*/g, '').trim();
      parsed = JSON.parse(cleaned);
    } catch (parseErr) {
      console.error('[AI Controller] Failed to parse Gemini response:', responseText);
      return res.status(502).json({
        success: false,
        message: 'AI returned an invalid response. Please try again.',
      });
    }

    // ── Validate structure ──
    const data = {
      SuggestedCategory: parsed.SuggestedCategory || 'Development',
      SkillTags: Array.isArray(parsed.SkillTags) ? parsed.SkillTags.slice(0, 6) : [],
      EstimatedBasePrice: parsed.EstimatedBasePrice || '$10 - $20',
    };

    return res.json({ success: true, data });

  } catch (err) {
    // ── Graceful Gemini-specific error handling ──
    if (err.message?.includes('API_KEY_INVALID') || err.message?.includes('PERMISSION_DENIED')) {
      console.error('[AI Controller] Invalid Gemini API Key:', err.message);
      return res.status(503).json({
        success: false,
        message: 'AI service authentication failed. Please check API key configuration.',
      });
    }

    if (err.message?.includes('RESOURCE_EXHAUSTED') || err.message?.includes('429')) {
      console.error('[AI Controller] Gemini rate limit hit:', err.message);
      return res.status(429).json({
        success: false,
        message: 'AI service is temporarily busy. Please wait a moment and try again.',
      });
    }

    console.error('[AI Controller] Unexpected error:', err);
    next(err);
  }
};
