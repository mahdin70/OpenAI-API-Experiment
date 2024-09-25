import { getLayoutDetailsForPage, getTextFromLayoutForPage } from "./pageExtractor.js";

const layoutDetails = getLayoutDetailsForPage(2);
const layoutText = getTextFromLayoutForPage(2);

console.log(layoutDetails);
console.log(layoutText);