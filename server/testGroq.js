import dotenv from 'dotenv'
dotenv.config()

async function test() {
  console.log('Testing Groq API...')
  console.log('Key present:', !!process.env.GROQ_API_KEY)

  const response = await fetch('https://api.groq.com/openai/v1/chat/completions', {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${process.env.GROQ_API_KEY}`,
      'Content-Type': 'application/json'
    },
    body: JSON.stringify({
      model: 'llama-3.1-8b-instant',
      max_tokens: 50,
      messages: [{ role: 'user', content: 'Say hello in one sentence.' }]
    })
  })

  const data = await response.json()
  console.log('Status:', response.status)
  console.log('Response:', JSON.stringify(data, null, 2))
}

test().catch(console.error)
