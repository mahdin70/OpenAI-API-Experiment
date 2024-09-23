require("dotenv").config();

const readline = require("readline");
const { getTotalPages } = require("./pageExtractor.js");
const { getPaginationSystemMessage } = require("./paginationSystemMessage.js");
const { ChatOpenAI } = require("@langchain/openai");
const { HumanMessage, AIMessage } = require("@langchain/core/messages");
const { InMemoryChatMessageHistory } = require("@langchain/core/chat_history");
const { initMongo, appendMessage, fetchPreviousContext } = require("./paginationDBInteraction.js");

const openaiApiKey = process.env.OPENAI_API_KEY;
const llm = new ChatOpenAI({
  model: "gpt-4o-mini",
  openaiApiKey: openaiApiKey,
  temperature: 0.5, // Balanced creativity and relevance
  maxTokens: 16384, // Maximum token limit
  topP: 0.5, // Prevent repetition
  presencePenalty: 0.8, // Maintains Context Strictly
});

const history = new InMemoryChatMessageHistory();

const rl = readline.createInterface({
  input: process.stdin,
  output: process.stdout,
  prompt: "User: ",
});

rl.prompt();

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

rl.on("line", async (userInput) => {
  if (userInput.toLowerCase() === "exit") {
    console.log("Ending chat session.");
    rl.close();
    return;
  }

  try {
    await initMongo();
    const previousContext = await fetchPreviousContext();
    const firstUserPrompt = previousContext.firstUserPrompt || {};
    const firstAIReply = previousContext.firstAIReply || {};

    const totalPages = getTotalPages();
    console.log(`Total Pages in the Magazine: ${totalPages}`);

    for (let pageNumber = 1; pageNumber <= totalPages; pageNumber++) {
      console.log(`\nProcessing Page ${pageNumber} :\n`);

      const systemMessage = getPaginationSystemMessage(pageNumber);
      history.addMessage(systemMessage);
      const startTime = Date.now();

      const userMessage = new HumanMessage(userInput);
      await appendMessage(pageNumber, "user", userInput);
      history.addMessage(userMessage);

      startSpinner();
      const messages = history.messages.map((message) => message.content);
      const response = await llm.invoke(messages);
      stopSpinner();

      const endTime = Date.now();
      const elapsedTime = (endTime - startTime) / 1000;

      const content = response.content;
      const tokenUsage = response.usage_metadata;

      console.log(`\rPage ${pageNumber} - Magazine-AI: ${content}`);

      history.addMessage(new AIMessage(content));
      if (!firstUserPrompt.content) {
        await appendMessage(pageNumber, "user", userInput);
      }
      if (!firstAIReply.content) {
        await appendMessage(pageNumber, "ai", content);
      }

      await appendMessage(pageNumber, "user", userInput);
      await appendMessage(pageNumber, "ai", content);

      console.log("================================================================================================");
      console.log(`Time taken: ${elapsedTime.toFixed(2)}s`);
      console.log(`Total Tokens: ${tokenUsage.total_tokens}`);
    }

    console.log("Completed all pages.");
    rl.prompt();
  } catch (error) {
    console.error("Error processing the page", error);
  }
});
