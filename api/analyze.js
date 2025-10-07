// api/analyze.js
export default async function handler(req, res) {
  if (req.method !== "POST") {
    return res.status(405).json({ success: false, error: "Method Not Allowed" });
  }

  try {
    const { snippetA, snippetB } = req.body || {};
    if (!snippetA || !snippetB) {
      return res.status(400).json({ success: false, error: "Both snippetA and snippetB are required" });
    }

    const OPENROUTER_API_KEY = process.env.OPENROUTER_API_KEY;
    if (!OPENROUTER_API_KEY) {
      return res.status(500).json({ success: false, error: "Server missing API key (OPENROUTER_API_KEY)" });
    }

    // Prompt: ask for JSON but be tolerant if model returns HTML/plain text
    const systemPrompt = `You are an expert SEO/AEO analyst. Compare two snippets and return a clear, concise analysis.
Preferably return a JSON object with keys:
{ "result_text": "...", "result_html": "<... optional HTML ...>", "scores": {...} }
If you cannot output JSON, return a short plain-text summary. Keep result_text <= 600 words.`;
    const userPrompt = `Snippet A:\n${snippetA}\n\nSnippet B:\n${snippetB}\n\nGive a comparison using the requested format.`;

    const fetchBody = {
      model: "openrouter/openai/gpt-4-turbo",
      messages: [
        { role: "system", content: systemPrompt },
        { role: "user", content: userPrompt }
      ],
      temperature: 0.25,
      max_tokens: 900
    };

    const r = await fetch("https://openrouter.ai/api/v1/chat/completions", {
      method: "POST",
      headers: {
        "Authorization": `Bearer ${OPENROUTER_API_KEY}`,
        "Content-Type": "application/json"
      },
      body: JSON.stringify(fetchBody),
    });

    const j = await r.json();
    // extract textual content safely
    const content =
      j?.choices?.[0]?.message?.content ||
      // fallback variants
      j?.output?.[0]?.content?.[0]?.text ||
      (typeof j === "string" ? j : JSON.stringify(j));

    // helpers
    function extractJSONFromText(text) {
      if (!text || typeof text !== "string") return null;
      // strip markdown fences then try to find JSON substring
      let cleaned = text.replace(/```json|```/gi, "");
      const start = cleaned.indexOf("{");
      if (start >= 0) cleaned = cleaned.slice(start);
      try {
        return JSON.parse(cleaned);
      } catch (e) {
        const match = cleaned.match(/\{[\s\S]*\}/);
        if (match) {
          try { return JSON.parse(match[0]); } catch (e2) { return null; }
        }
        return null;
      }
    }
    function stripHtmlTags(str) {
      if (!str || typeof str !== "string") return "";
      return str.replace(/<[^>]*>/g, "").replace(/\s{2,}/g, " ").trim();
    }
    function looksLikeHTML(str) {
      if (!str || typeof str !== "string") return false;
      return /<\/?[a-z][\s\S]*>/i.test(str);
    }

    // Try to parse JSON out of the content if the model returned JSON
    const parsed = extractJSONFromText(content);
    let result_text = null;
    let result_html = null;

    if (parsed && typeof parsed === "object") {
      // accept multiple possible keys
      result_text = parsed.result_text || parsed.result || parsed.analysis || parsed.summary || null;
      result_html = parsed.result_html || parsed.html || (typeof parsed.html === "string" ? parsed.html : null);
      // If the parsed object contains nested fields like scores, you can include them in the response:
      // e.g. scores = parsed.scores
    }

    // If no parsed JSON result_text, check if the raw content is HTML
    if (!result_text) {
      if (looksLikeHTML(content)) {
        result_html = content;
        result_text = stripHtmlTags(content);
      } else {
        // fallback: take the raw content as text
        result_text = typeof content === "string" ? content : JSON.stringify(content);
      }
    }

    // ensure strings are safe length
    if (typeof result_text === "string" && result_text.length > 40000) {
      result_text = result_text.slice(0, 40000) + "...";
    }

    return res.status(200).json({
      success: true,
      result: result_text,
      html: result_html || null,
      raw: content
    });
  } catch (err) {
    console.error("analyze error:", err);
    return res.status(500).json({ success: false, error: "AI service error", details: err?.message || String(err) });
  }
}
