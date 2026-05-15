import { requireEnv } from './env.mjs'

export async function generateJson(prompt, { model = process.env.BOT_MODEL || 'gpt-4.1-mini' } = {}) {
  requireEnv(['OPENAI_API_KEY'])

  const response = await fetch('https://api.openai.com/v1/responses', {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${process.env.OPENAI_API_KEY}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      model,
      input: [
        {
          role: 'system',
          content: 'You are a careful social media writing assistant. Return only valid JSON.',
        },
        {
          role: 'user',
          content: prompt,
        },
      ],
      text: {
        format: {
          type: 'json_object',
        },
      },
    }),
  })

  const json = await response.json().catch(() => ({}))

  if (!response.ok) {
    throw new Error(`OpenAI API error ${response.status}: ${JSON.stringify(json)}`)
  }

  const outputText = json.output_text || json.output?.flatMap((item) => item.content || [])
    .map((content) => content.text)
    .filter(Boolean)
    .join('\n')

  return JSON.parse(outputText)
}
