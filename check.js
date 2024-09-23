import { getLayoutDetails, getTextFromLayout } from "./layoutUtils.js";

const filePath = "./Texract-JSON/MedicalAnalyzeDocResponse.json";

const layoutDetails = getLayoutDetails(filePath);
const layoutText = getTextFromLayout(filePath);

console.log(layoutDetails);
console.log(layoutText);