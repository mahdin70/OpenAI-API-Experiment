const fs = require("fs");
const path = require("path");

const inputFilePath = path.join(__dirname, "Texract-JSON", "TestanalyzeDocResponse.json");
const data = JSON.parse(fs.readFileSync(inputFilePath, "utf8"));

const PAGE_WIDTH = 793.92;
const PAGE_HEIGHT = 1123.2;

function getBlockById(id) {
  return data.Blocks.find((block) => block.Id === id);
}

// function to convert bounding box values into CSS styles
function getBoundingBoxStyles(boundingBox) {
  const width = boundingBox.Width * PAGE_WIDTH;
  const height = boundingBox.Height * PAGE_HEIGHT;
  const left = boundingBox.Left * PAGE_WIDTH;
  const top = boundingBox.Top * PAGE_HEIGHT;

  return `
    width: ${width}px;
    height: ${height}px;
    left: ${left}px;
    top: ${top}px;
    position: absolute;
    border: 1px solid black;
    box-sizing: border-box;
  `;
}

function renderBlock(block) {
  if (block.BlockType === "WORD" || block.BlockType === "KEY_VALUE_SET" || block.BlockType === "LINE") return "";
  const boundingBoxStyles = block.Geometry && block.Geometry.BoundingBox ? getBoundingBoxStyles(block.Geometry.BoundingBox) : "";

  // if the block is a LAYOUT_FIGURE, render the only BlockType since it has no text/element inside it
  if (block.BlockType === "LAYOUT_FIGURE") {
    return `
      <div style="${boundingBoxStyles}">
        <strong>${block.BlockType}</strong>
      </div>
    `;
  }

  // for other block types, render the Text or the child line text
  if (block.Relationships) {
    const childIds = block.Relationships.filter((rel) => rel.Type === "CHILD").flatMap((rel) => rel.Ids);

    const childLineText = childIds
      .map((id) => getBlockById(id))
      .filter((childBlock) => childBlock && childBlock.BlockType === "LINE")
      .map((lineBlock) => lineBlock.Text || "")
      .join(" ");

    return `
      <div style="${boundingBoxStyles}">
        ${block.BlockType} + ${block.Text || ""} ${childLineText}
      </div>
    `;
  }

  // if no relationships, just render the block with its bounding box style
  return `
    <div style="${boundingBoxStyles}">
      ${block.BlockType} + ${block.Text || ""}
    </div>
  `;
}

// function to recursively render blocks and their children
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

// function to render a page
function renderPage(pageBlock) {
  if (!pageBlock || !pageBlock.Relationships) return "No PAGE block found";
  return renderBlocks(pageBlock.Relationships[0].Ids);
}

// rendering the pages
const pageBlocks = data.Blocks.filter((block) => block.BlockType === "PAGE");
const pagesContent = pageBlocks.map(
  (pageBlock) => `
    <div class="page">
      ${renderPage(pageBlock)}
    </div>
  `
);

const outputHtml = `
<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Blocks with Bounding Box Styles</title>
    <style>
        body { font-family: Arial, sans-serif; }
        .page {
            width: ${PAGE_WIDTH}px;
            height: ${PAGE_HEIGHT}px;
            margin: 10px auto;
            border: 1px solid #ccc;
            box-sizing: border-box;
            position: relative;
            font-size: 10px;
        }
        .page + .page {
            page-break-before: always;
        }
        div {
            position: absolute;
        }
    </style>
</head>
<body>
    ${pagesContent}
</body>
</html>
`;

const outputFilePath = path.join(__dirname, "Output-HTML", "TestPageLayoutOutput.html");
fs.writeFileSync(outputFilePath, outputHtml, "utf8");

console.log(`HTML file generated at: ${outputFilePath}`);
