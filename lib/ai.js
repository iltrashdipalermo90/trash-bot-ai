const { OpenAI } = require('openai');
require('dotenv').config();

const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
});

async function askGPT(prompt) {
  try {
    const res = await openai.chat.completions.create({
      model: 'gpt-3.5-turbo',
      messages: [{ role: 'user', content: prompt }],
    });
    return res.choices[0].message.content.trim();
  } catch (err) {
    console.error('Errore OpenAI:', err.message);
    return '⚠️ Errore durante la risposta da ChatGPT.';
  }
}

module.exports = askGPT;
