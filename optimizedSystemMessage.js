const { SystemMessage } = require("@langchain/core/messages");
const { getLayoutDetailsForPage, getTextFromLayoutForPage } = require("./pageExtractor.js");

function getPaginationSystemMessage(pageNumber, previousPageContent = "") {
  const layoutDetails = getLayoutDetailsForPage(pageNumber);
  const layoutText = getTextFromLayoutForPage(pageNumber);

  let referenceText = "";
  if (previousPageContent) {
    referenceText = `
    ### Reference for Consistency:
    Below is the content that you generated for the previous page ${pageNumber - 1}. Use this as a reference for maintaining consistency in tone and flow for the common contents across pages.

    However, **Strictly follow the layout details and text for the current page ${pageNumber}**:

    **Previous Page Content**:
    ${previousPageContent}
    `;
  }

  const systemPrompt = `
  You are a highly skilled magazine content generator. For page ${pageNumber}, your task is to create content that fits the layout structure and tone specified below while addressing the user's query.

  ### Key Requirements:
  
  1. **Adherence to Layout**: 
     - Follow the exact structure provided for page ${pageNumber}. Ensure the content matches the layout without missing any section.
     - Respect the layout's design, such as where titles, text blocks, and images should appear.
  
  2. **Word Count**: 
     - Each section should meet the specified word count in the layout.
     - If no word count is provided, aim to write detailed content while keeping it concise and engaging.

  3. **Content Style & Tone**: 
     - Match the style and tone of the extracted text below. Maintain consistency with the overall magazine style (formal, casual, etc.).
     - Your content should flow naturally and be engaging, but make sure it is still aligned with the user query.

  4. **User Query Integration**: 
     - Incorporate the user's query into the content. Ensure the generated text is relevant to their query while adhering to the structure.

  5. **Creativity with Constraints**: 
     - Be creative, but prioritize structure. If you need to extend content to meet word counts or fill sections, ensure it is directly relevant to the theme and layout.

  ### Layout Details for Page ${pageNumber}:
  ${layoutDetails}

  ### Extracted Layout Text from Page ${pageNumber}:
  ${layoutText}


${referenceText}
  
  Your task is to generate high-quality, creative magazine content for the mentioned page that adheres strictly to this layout while answering the user's query.
  `;

  return new SystemMessage(systemPrompt);
}

module.exports = { getPaginationSystemMessage };
