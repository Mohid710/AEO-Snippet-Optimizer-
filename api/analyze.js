export default async function handler(req, res) {
  if (req.method !== "POST") {
    return res.status(405).json({ message: "Method Not Allowed" });
  }

  try {
    const { snippetA, snippetB } = req.body;
    if (!snippetA || !snippetB) {
      return res.status(400).json({ message: "Both snippets are required" });
    }

    const OPENROUTER_API_KEY = process.env.OPENROUTER_API_KEY;

    const response = await fetch("https://openrouter.ai/api/v1/chat/completions", {
      method: "POST",
      headers: {
        "Authorization": `Bearer ${OPENROUTER_API_KEY}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: "openai/gpt-4-turbo",
        messages: [
          {
            role: "system",
            content: "You are an advanced SEO expert specialized in Answer Engine Optimization (AEO) snippet analysis. Always provide results in a clear HTML-based structure suitable for a web dashboard. Include scoring, winner identification, and improvement tips."
          },
          {
            role: "user",
            content: `Compare these two snippets for AEO performance:
            Snippet A: ${snippetA}
            Snippet B: ${snippetB}
            
            Evaluate based on:
            1. Relevance
            2. Clarity
            3. Structured Data Presence
            4. FAQ Formatting
            5. SERP Appeal

            Return a professional HTML report that includes:
            - A scoring table (0–10)
            - Summary section identifying the winner
            - Key improvement tips (bullet points)
            - Use soft colors and clean layout for readability.`
          }
        ],
        temperature: 0.4,
      }),
    });

    const data = await response.json();

    if (!response.ok) {
      throw new Error(data.error?.message || "Failed to generate analysis");
    }

    res.status(200).json({
      success: true,
      analysis: data.choices?.[0]?.message?.content || "No response received",
    });
  } catch (error) {
    console.error("Error:", error);
    res.status(500).json({ success: false, message: error.message });
  }
}
