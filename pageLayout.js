const fs = require("fs");
const path = require("path");

const inputFilePath = path.join(__dirname, "Texract-JSON", "LayoutAnalyzeDocResponse.json");
const data = JSON.parse(fs.readFileSync(inputFilePath, "utf8")); // parsing data from the JSON file in the JS Object Format

function getBlockById(id) {
  //helper function to get the block ids
  return data.Blocks.find((block) => block.Id === id);
}

function renderBlock(block) {
  // if the block type is WORD, KEY_VALUE_SET or LINE then we don't want to render it. So, we will return an empty string
  if (block.BlockType === "WORD" || block.BlockType === "KEY_VALUE_SET" || block.BlockType === "LINE") return "";

  // finding the child blocks of the block which has some relationship
  if (block.Relationships) {
    const childIds = block.Relationships.filter((rel) => rel.Type === "CHILD").flatMap((rel) => rel.Ids);

    const childLineText = childIds
      .map((id) => getBlockById(id))
      .filter((childBlock) => childBlock && childBlock.BlockType === "LINE")
      .map((lineBlock) => lineBlock.Text || "")
      .join(" ");

    // function for the blocks which has some relationship
    return `<div style="border: 1px solid black; margin: 5px; padding: 5px;"> 
              <strong>${block.BlockType}</strong><br>
              ${block.Text || ""} ${childLineText}
            </div>`;
  }

  //function for the blocks which doesn't have any relationship
  return `<div style="border: 1px solid black; margin: 5px; padding: 5px;">
            <strong>${block.BlockType}</strong><br>
            ${block.Text || ""}
          </div>`;
}

//function for rendering multiple blocks recursively using the renderBlock() function
function renderBlocks(blockIds) {
  return blockIds
    .map((id) => {
      const block = getBlockById(id);
      if (!block) return "";

      let html = renderBlock(block);

      if (block.Relationships) {
        const childIds = block.Relationships.filter((rel) => rel.Type === "CHILD").flatMap((rel) => rel.Ids);
        if (childIds.length > 0) {
          html += renderBlocks(childIds);
        }
      }

      return html;
    })
    .join("");
}

//function for renderting the page blocks using the renderBlocks() function while maintainting the child blocks relationship with that page block
function renderPage(pageBlock) {
  if (!pageBlock || !pageBlock.Relationships) return "No PAGE block found";
  return renderBlocks(pageBlock.Relationships[0].Ids);
}

// rendering page blocks
const pageBlocks = data.Blocks.filter((block) => block.BlockType === "PAGE");
const pagesContent = pageBlocks.map(
  (pageBlock) => `
    <div class="page">
      ${renderPage(pageBlock)}
    </div>
  `
);


//overall html structure
const outputHtml = `
<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Blocks</title>
    <style>
        body { font-family: Arial, sans-serif; }
        .page {
            width: 793.92px;
            height: 1123.2px;
            margin: 10px auto;
            border: 1px solid #ccc;
            padding: 20px;
            box-sizing: border-box;
            position: relative;
        }
        .page + .page {
            page-break-before: always;
        }
    </style>
</head>
<body>
    ${pagesContent}
</body>
</html>
`;

const outputFilePath = path.join(__dirname, "Output-HTML", "PageLayoutOutput.html");
fs.writeFileSync(outputFilePath, outputHtml, "utf8");

console.log(`HTML file generated at: ${outputFilePath}`);
