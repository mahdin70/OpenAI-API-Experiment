const readline = require('readline');
const { getLayoutDetails } = require('./layoutUtils');
const { getChatResponse, saveToHistory } = require('./completionHandler');

const userInterface = readline.createInterface({
  input: process.stdin,
  output: process.stdout,
});

const extraInstruction = 'Please Give the Magazine By Strictly Following the Layout Details Provided Below\n';

userInterface.prompt();
userInterface.on('line', async (input) => {
  try {
    const layoutDetails = getLayoutDetails();
    const prompt = `User prompt: ${input}\n${extraInstruction}\nLayout Details:\n${layoutDetails}`;

    const assistantMessage = await getChatResponse(prompt);
    console.log(assistantMessage);

    saveToHistory(input, assistantMessage);
  } catch (error) {
    console.error('Error:', error.message);
  }
  userInterface.prompt();
});
