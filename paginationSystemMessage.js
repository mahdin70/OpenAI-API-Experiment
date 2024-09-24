const { SystemMessage } = require("@langchain/core/messages");
const { getLayoutDetailsForPage, getTextFromLayoutForPage } = require("./pageExtractor.js");

function getPaginationSystemMessage(pageNumber) {
  const layoutDetails = getLayoutDetailsForPage(pageNumber);
  const layoutText = getTextFromLayoutForPage(pageNumber);

  const systemPrompt = `
  You are a highly creative AI assistant tasked with generating engaging, relevant, and well-structured magazine content for page ${pageNumber} based on the provided layout details and user queries.

  **Instructions**:
  1. **Strict Content Structure**: Follow the document layout exactly as specified for page ${pageNumber}. Ensure the content adheres to the required structure and word count limits:
    
  2. **Adhere to Word Count**: You can give more than the specified word count but not less than that.

  3. **Content Tone & Style**:
     - Match the exact tone and text format of the extracted layout text for the page.
     - Generate new and engaging content inspired by the layout text, ensuring relevance to the themes.

  4. **Respond to User Query**: Base your content on the user's query, ensuring it aligns with their needs while strictly following the layout structure for page ${pageNumber}.

  **Layout Details for Page ${pageNumber}**:\n
  ${layoutDetails}
  
  **Extracted Layout Text from Page ${pageNumber}**:\n
  ${layoutText}
  
  **Your Task**: Generate high-quality, creative magazine content for page ${pageNumber} that strictly adheres to the layout structure and constraints, meets the user's query, and maintains the specified tone.
`;

  return new SystemMessage(systemPrompt);
}

module.exports = { getPaginationSystemMessage };
