require("dotenv").config();

const readline = require("readline");
const { getTotalPages } = require("./pageExtractor.js");
const { getPaginationSystemMessage } = require("./optimizedSystemMessage.js");
const { ChatOpenAI } = require("@langchain/openai");
const { HumanMessage, AIMessage } = require("@langchain/core/messages");
const { InMemoryChatMessageHistory } = require("@langchain/core/chat_history");
const { initMongo, appendMessage, fetchPreviousContext } = require("./paginationDBInteraction.js");

const openaiApiKey = process.env.OPENAI_API_KEY;
const llm = new ChatOpenAI({
  model: "gpt-4o-mini",
  openaiApiKey: openaiApiKey,
  temperature: 0.5,     // Balanced creativity and relevance
  maxTokens: 16384,     // Maximum token limit
  topP: 0.5,            // Prevent repetition
  presencePenalty: 0.8, // Maintains Context Strictly
});

const rl = readline.createInterface({
  input: process.stdin,
  output: process.stdout,
  prompt: "User: ",
});

const spinnerChars = ["|", "/", "-", "\\"];
let spinnerIndex = 0;
let spinnerInterval;

function startSpinner(pageNumber) {
  spinnerInterval = setInterval(() => {
    process.stdout.write(`\rGenerating the Page ${pageNumber} Contents of the Magazine... ${spinnerChars[spinnerIndex++]}`);
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
    let latestUserPrompt = "";
    let latestAIReply = "";

    if (previousContext) {
      latestUserPrompt = previousContext.latestUserPrompt || "";
      if (previousContext.latestAIReply && Array.isArray(previousContext.latestAIReply.pages)) {
        latestAIReply = previousContext.latestAIReply.pages
          .map((page) => page.content)
          .filter((content) => content)
          .join("\n\n\n");
      }
    }

    if (latestUserPrompt && latestAIReply) {
      const previousUserPrompt = "Previous User Prompt:\n" + latestUserPrompt;
      const previousAIReply = "Previous Magazine-AI Reply:\n" + latestAIReply;

      console.log(`\n${previousUserPrompt}\n${previousAIReply}`);
    }

    const totalPages = getTotalPages();
    console.log("======================================================================================");
    console.log(`Total Pages to be generated in the Magazine: ${totalPages}`);

    rl.prompt();

    rl.on("line", async (userInput) => {
      if (userInput.toLowerCase() === "exit") {
        console.log("Ending chat session.");
        rl.close();
        return;
      }

      let previousAIPageContent = ""; 

      for (let pageNumber = 1; pageNumber <= totalPages; pageNumber++) {
        console.log(`\nProcessing Page ${pageNumber} :\n`);

        const pageHistory = new InMemoryChatMessageHistory();

        const systemMessage = getPaginationSystemMessage(pageNumber, previousAIPageContent);
        pageHistory.addMessage(systemMessage);

        const startTime = Date.now();

        const userMessage = new HumanMessage(userInput);
        await appendMessage(pageNumber, "user", userInput);
        pageHistory.addMessage(userMessage); 

        startSpinner(pageNumber);
        const messages = pageHistory.messages.map((message) => message.content);
        const response = await llm.invoke(messages);
        stopSpinner();

        const endTime = Date.now();
        const elapsedTime = (endTime - startTime) / 1000;

        const content = response.content;
        const tokenUsage = response.usage_metadata;

        console.log(`\rPage ${pageNumber} - Magazine-AI:\n ${content}`);

        await appendMessage(pageNumber, "ai", content);
        previousAIPageContent = content;

        console.log("===================================================================================");
        console.log(`Time taken: ${elapsedTime.toFixed(2)}s`);
        console.log(`Input Tokens: ${tokenUsage.input_tokens}`);
        console.log(`Output Tokens: ${tokenUsage.output_tokens}`);
        console.log(`Total Tokens: ${tokenUsage.total_tokens}`);

        console.log("===================================================================================");
        console.log(`History Object: \n ${messages}`);
      }

      console.log("Completed all pages.");
      rl.prompt();
    });
  } catch (error) {
    console.error("Error starting chat:", error);
  }
}

startChat();
