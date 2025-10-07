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
            content: "You are an advanced SEO expert specialized in Answer Engine Optimization (AEO) snippet analysis. You compare two snippets and provide a structured comparative report with clear metrics.",
          },
          {
            role: "user",
            content: `Compare these two snippets for AEO performance:\n\nSnippet A:\n${snippetA}\n\nSnippet B:\n${snippetB}\n\nPlease evaluate based on relevance, clarity, structured data presence, FAQ formatting, and SERP appeal.`,
          },
        ],
        temperature: 0.3,
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
