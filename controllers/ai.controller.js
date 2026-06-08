// ── AI-Powered Smart Pricing & Gig Estimator Controller ─────────────────────
// Uses Google Gemini API to analyze a project description and return
// category, skill tags, and estimated price range for the UIU campus market.
const { GoogleGenerativeAI } = require('@google/generative-ai');

// System prompt engineered for structured JSON output
const SYSTEM_PROMPT = `You are GigVerse AI — a smart pricing engine for a university campus freelance marketplace (UIU — United International University, Bangladesh).

Given a user's project description, analyze it and return a JSON object with EXACTLY these fields:
1. "SuggestedCategory" — ONE of: "Design", "Development", "Writing", "Marketing", "Tutoring", "Academic & Course Guidelines", "Career Mentorship & Grooming"
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
    if (!process.env.GEMINI_API_KEY) {
      console.warn('[AI Controller] GEMINI_API_KEY is not set in environment variables.');
      return res.status(503).json({
        success: false,
        message: 'AI service is not configured. Please contact the administrator.',
      });
    }

    // ── Call Gemini API ──
    const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY);
    const model = genAI.getGenerativeModel({ model: 'gemini-2.0-flash' });

    let responseText;
    try {
      const result = await model.generateContent({
        contents: [
          { role: 'user', parts: [{ text: `${SYSTEM_PROMPT}\n\nUser request: "${prompt.trim()}"` }] },
        ],
        generationConfig: {
          temperature: 0.4,
          maxOutputTokens: 300,
        },
      });

      // Extract text — guard against missing response structure
      const response = result?.response;
      if (!response) {
        console.error('[AI Controller] Gemini returned no response object.');
        return res.status(502).json({
          success: false,
          message: 'AI returned an empty response. Please try again.',
        });
      }

      responseText = (typeof response.text === 'function' ? response.text() : response.text || '').trim();

      if (!responseText) {
        console.error('[AI Controller] Gemini returned empty text.');
        return res.status(502).json({
          success: false,
          message: 'AI returned an empty response. Please try again.',
        });
      }
    } catch (apiErr) {
      console.error('[AI Controller] Gemini API call failed:', apiErr.message || apiErr);

      // ── Graceful Gemini-specific error handling ──
      if (apiErr.message?.includes('API_KEY_INVALID') || apiErr.message?.includes('PERMISSION_DENIED')) {
        return res.status(503).json({
          success: false,
          message: 'AI service authentication failed. Please check API key configuration.',
        });
      }
      if (apiErr.message?.includes('RESOURCE_EXHAUSTED') || apiErr.message?.includes('429')) {
        return res.status(429).json({
          success: false,
          message: 'AI service is temporarily busy. Please wait a moment and try again.',
        });
      }

      return res.status(502).json({
        success: false,
        message: 'AI service encountered an error. Please try again shortly.',
      });
    }

    // ── Parse the JSON response ──
    let parsed;
    try {
      // Strip markdown code fences if the model wraps them
      const cleaned = responseText.replace(/```json\s*/gi, '').replace(/```\s*/g, '').trim();
      parsed = JSON.parse(cleaned);
    } catch (parseErr) {
      console.error('[AI Controller] Failed to parse Gemini response:', responseText);
      // Attempt to extract JSON from within the text
      try {
        const jsonMatch = responseText.match(/\{[\s\S]*\}/);
        if (jsonMatch) {
          parsed = JSON.parse(jsonMatch[0]);
        } else {
          return res.status(502).json({
            success: false,
            message: 'AI returned an invalid response format. Please try again.',
          });
        }
      } catch (_) {
        return res.status(502).json({
          success: false,
          message: 'AI returned an invalid response. Please try again.',
        });
      }
    }

    // ── Validate structure ──
    const data = {
      SuggestedCategory: parsed.SuggestedCategory || 'Development',
      SkillTags: Array.isArray(parsed.SkillTags) ? parsed.SkillTags.slice(0, 6) : [],
      EstimatedBasePrice: parsed.EstimatedBasePrice || '$10 - $20',
    };

    return res.json({ success: true, data });

  } catch (err) {
    console.error('[AI Controller] Unexpected error:', err);
    return res.status(500).json({
      success: false,
      message: 'An unexpected error occurred with the AI service. Please try again.',
    });
  }
};
