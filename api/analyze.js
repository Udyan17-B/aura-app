export default async function handler(req, res) {
    if (req.method !== "POST") {
        return res.status(405).json({ error: "Method not allowed" });
          }

            const { prompt, maxTokens } = req.body || {};
              if (!prompt) {
                  return res.status(400).json({ error: "Prompt is required" });
                    }

                      try {
                          const response = await fetch("https://api.groq.com/openai/v1/chat/completions", {
                                method: "POST",
                                      headers: {
                                              "Content-Type": "application/json",
                                                      "Authorization": `Bearer ${process.env.GROQ_API_KEY}`
                                                            },
                                                                  body: JSON.stringify({
                                                                          model: "llama-3.3-70b-versatile",
                                                                                  max_tokens: maxTokens || 6500,
                                                                                          temperature: 0.7,
                                                                                                  messages: [
                                                                                                            { role: "system", content: "You always respond with ONLY valid raw JSON. No markdown, no code fences, no commentary." },
                                                                                                                      { role: "user", content: prompt }
                                                                                                                              ]
                                                                                                                                    })
                                                                                                                                        });

                                                                                                                                            const data = await response.json();

                                                                                                                                                if (data.error) {
                                                                                                                                                      return res.status(500).json({ error: data.error.message || "Groq API error" });
                                                                                                                                                          }

                                                                                                                                                              // Normalize into the { content: [{ text }] } shape the frontend expects
                                                                                                                                                                  const text = data.choices?.[0]?.message?.content || "";
                                                                                                                                                                      return res.status(200).json({ content: [{ text }] });

                                                                                                                                                                        } catch (err) {
                                                                                                                                                                            return res.status(500).json({ error: err.message });
                                                                                                                                                                              }
                                                                                                                                                                              }
}