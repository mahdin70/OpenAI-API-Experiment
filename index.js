const dotenv = require("dotenv");
dotenv.config();

const OpenAI = require("openai");
const readline = require("readline");

const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
});

const userInterface = readline.createInterface({
  input: process.stdin,
  output: process.stdout,
});

const messages = [];

userInterface.prompt();
userInterface.on("line", async (input) => {
  try {
    messages.push({ role: "user", content: input });

    const response = await openai.chat.completions.create({
      model: "gpt-4o-mini",
      messages: messages, 
    });

    const assistantMessage = response.choices[0].message.content;
    console.log(assistantMessage);
    console.log(messages);

    messages.push({ role: "assistant", content: assistantMessage });
  } catch (error) {
    console.error('Error:', error.message);
  }
  userInterface.prompt();
});
