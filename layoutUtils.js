const fs = require('fs');
const path = require('path');

const inputFilePath = path.join(__dirname, 'Texract-JSON', 'TestanalyzeDocResponse.json');

const data = JSON.parse(fs.readFileSync(inputFilePath, 'utf8'));

function getBlockById(id) {
  return data.Blocks.find((block) => block.Id === id);
}

function getWordCountFromLine(lineBlock) {
  const wordIds = lineBlock.Relationships ? lineBlock.Relationships.find((rel) => rel.Type === 'CHILD')?.Ids : [];
  if (!wordIds) return 0;

  const words = wordIds.map((id) => getBlockById(id)).filter((block) => block && block.BlockType === 'WORD');
  const wordCount = words.reduce((count, wordBlock) => count + (wordBlock.Text ? wordBlock.Text.split(/\s+/).length : 0), 0);

  return wordCount;
}

function getWordCountFromParent(parentBlock) {
  const lineIds = parentBlock.Relationships ? parentBlock.Relationships.find((rel) => rel.Type === 'CHILD')?.Ids : [];
  if (!lineIds) return 0;

  const lines = lineIds.map((id) => getBlockById(id)).filter((block) => block && block.BlockType === 'LINE');
  const totalWordCount = lines.reduce((count, lineBlock) => count + getWordCountFromLine(lineBlock), 0);

  return totalWordCount;
}

function getLayoutDetails() {
  const pageBlocks = data.Blocks.filter((block) => block.BlockType === 'PAGE');
  let layoutDetails = '';

  pageBlocks.forEach((pageBlock) => {
    let pageContent = `Page ${pageBlock.Page}\n\n`;
    const blockCounts = {
      LAYOUT_TITLE: [],
      LAYOUT_SECTION_HEADER: [],
      LAYOUT_TEXT: [],
    };

    function renderBlockWithCounts(block, blockCounts) {
      let output = '';

      if (block.BlockType === 'LAYOUT_TITLE' || block.BlockType === 'LAYOUT_SECTION_HEADER' || block.BlockType === 'LAYOUT_TEXT') {
        const wordCount = getWordCountFromParent(block);

        if (!blockCounts[block.BlockType]) {
          blockCounts[block.BlockType] = [];
        }
        const countIndex = blockCounts[block.BlockType].length;
        blockCounts[block.BlockType][countIndex] = (blockCounts[block.BlockType][countIndex] || 0) + 1;

        output += `${block.BlockType} - ${countIndex + 1} Word Count: ${wordCount}\n`;
      }

      if (block.Relationships) {
        const childIds = block.Relationships.filter((rel) => rel.Type === 'CHILD').flatMap((rel) => rel.Ids);

        childIds.forEach((id) => {
          const childBlock = getBlockById(id);
          if (childBlock && (childBlock.BlockType === 'LAYOUT_TEXT' || childBlock.BlockType === 'LAYOUT_SECTION_HEADER')) {
            output += renderBlockWithCounts(childBlock, blockCounts);
          }
        });
      }

      return output;
    }

    function renderBlocksWithCounts(blockIds, blockCounts) {
      return blockIds
        .map((id) => {
          const block = getBlockById(id);
          if (!block) return '';

          return renderBlockWithCounts(block, blockCounts);
        })
        .join('');
    }

    const blockContent = renderBlocksWithCounts(pageBlock.Relationships[0].Ids, blockCounts);
    layoutDetails += pageContent + blockContent + '\n';
  });

  return layoutDetails;
}

module.exports = { getLayoutDetails };
