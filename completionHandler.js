const fs = require('fs');
const path = require('path');
const OpenAI = require('openai');
const dotenv = require('dotenv');

dotenv.config();

const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
});

const historyFilePath = path.join(__dirname, 'History.json');

function loadHistory() {
  if (!fs.existsSync(historyFilePath)) {
    fs.writeFileSync(historyFilePath, JSON.stringify([]));
    return [];
  }
  const historyContent = fs.readFileSync(historyFilePath, 'utf8');
  try {
    return JSON.parse(historyContent);
  } catch (error) {
    console.error('Error parsing History.json:', error.message);
    return [];
  }
}

function saveToHistory(prompt, response) {
  const history = loadHistory();
  history.push({ role: 'user', content: prompt });
  history.push({ role: 'assistant', content: response });
  fs.writeFileSync(historyFilePath, JSON.stringify(history, null, 2));
}

async function getChatResponse(prompt) {
  const previousHistory = loadHistory();
  const response = await openai.chat.completions.create({
    model: 'gpt-4o-mini',
    messages: [...previousHistory, { role: 'user', content: prompt }],
  });
  return response.choices[0].message.content;
}

module.exports = { getChatResponse, saveToHistory };
