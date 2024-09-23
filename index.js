require("dotenv").config();
const readline = require("readline");
const { ChatOpenAI } = require("@langchain/openai");
const { HumanMessage, AIMessage } = require("@langchain/core/messages");
const { InMemoryChatMessageHistory } = require("@langchain/core/chat_history");
const { initMongo, appendMessage, fetchPreviousContext } = require("./dbInteraction.js");
const { getSystemMessage } = require("./systemMessage");

const openaiApiKey = process.env.OPENAI_API_KEY;

const llm = new ChatOpenAI({
  model: "gpt-4o-mini",
  openaiApiKey: openaiApiKey,
  temperature: 0.5,      // Balanced creativity and relevance
  maxTokens: 16384,      // Maximum token limit
  topP: 0.5,             // Prevent repetition
  presencePenalty: 0.8   // Maintains Context Strictly
});

const history = new InMemoryChatMessageHistory();

const spinnerChars = ["|", "/", "-", "\\"];
let spinnerIndex = 0;
let spinnerInterval;

function startSpinner() {
  spinnerInterval = setInterval(() => {
    process.stdout.write(`\rGenerating the Magazine Contents... ${spinnerChars[spinnerIndex++]}`);
    spinnerIndex %= spinnerChars.length;
  }, 100);
}

function stopSpinner() {
  clearInterval(spinnerInterval);
}

async function startChat() {
  try {
    await initMongo();
    const previousContext = await fetchPreviousContext();

    const latestThread = previousContext.latestThread || {};
    const firstUserPrompt = previousContext.firstUserPrompt || {};
    const firstAIReply = previousContext.firstAIReply || {};

    const latestUserPrompt = latestThread.userPrompt || {};
    const latestAIReply = latestThread.aiReply || {};

    if (latestUserPrompt.content) {
      console.log(`User: ${latestUserPrompt.content}`);
    }
    if (latestAIReply.content) {
      console.log(`AI: ${latestAIReply.content}`);
    }

    console.log("================================================================================================");
    console.log("Start chatting with the AI (type 'exit' to stop):");

    const systemMessage = getSystemMessage();
    history.addMessage(systemMessage);

    if (latestUserPrompt.content) {
      history.addMessage(new HumanMessage(latestUserPrompt.content));
    }
    if (latestAIReply.content) {
      history.addMessage(new AIMessage(latestAIReply.content));
    }

    const rl = readline.createInterface({
      input: process.stdin,
      output: process.stdout,
    });

    rl.on("line", async (userInput) => {
      if (userInput.toLowerCase() === "exit") {
        console.log("Ending chat session.");
        rl.close();
        return;
      }

      const startTime = Date.now();
      const userMessage = new HumanMessage(userInput);
      history.addMessage(userMessage);

      startSpinner();
      const messages = history.messages;
      const response = await llm.invoke(messages);
      stopSpinner();

      const endTime = Date.now();
      const elapsedTime = (endTime - startTime) / 1000;

      const content = response.content;
      const tokenUsage = response.usage_metadata;

      console.log(`\rMagazine-AI: ${content}`);

      history.addMessage(new AIMessage(content));

      if (!firstUserPrompt.content) {
        await appendMessage("user", userInput);
      }
      if (!firstAIReply.content) {
        await appendMessage("ai", content);
      }

      await appendMessage("user", userInput);
      await appendMessage("ai", content);

      console.log("================================================================================================");
      console.log(`Time taken: ${elapsedTime.toFixed(2)}s`);
      console.log(`Input Tokens: ${tokenUsage.input_tokens}`);
      console.log(`Output Tokens: ${tokenUsage.output_tokens}`);
      console.log(`Total Tokens: ${tokenUsage.total_tokens}`);
    });
  } catch (error) {
    console.error("Error starting chat:", error);
  }
}

startChat();
