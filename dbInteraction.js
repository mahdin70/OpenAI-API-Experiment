require("dotenv").config();
const { MongoClient } = require("mongodb");
const { getLayoutDetails, getTextFromLayout } = require("./layoutUtils");

const mongoUri = process.env.MONGO_URI;
const client = new MongoClient(mongoUri);

const dbName = "MagazineAIChatDatabase";
let db;
let chatCollection;

async function initMongo() {
  try {
    await client.connect();
    db = client.db(dbName);
    chatCollection = db.collection("ChatHistory");
    console.log("MongoDB connected and collection initialized.");
  } catch (error) {
    console.error("Error connecting to MongoDB:", error);
  }
}

const filePath = "./Texract-JSON/MedicalAnalyzeDocResponse.json";
const layoutDetails = getLayoutDetails(filePath);
const layoutText = getTextFromLayout(filePath);

async function appendMessage(role, content) {
  try {
    const conversation = await chatCollection.findOne();

    const timestamp = new Date();
    if (conversation) {
      if (role === "user") {
        await chatCollection.updateOne(
          { _id: conversation._id },
          {
            $set: {
              latestUserPrompt: { role, content, timestamp },
              updatedAt: timestamp,
            },
          }
        );
      } else if (role === "ai") {
        if (!conversation.first_ai_reply) {
          await chatCollection.updateOne(
            { _id: conversation._id },
            {
              $set: {
                firstAIReply: { role, content, timestamp },
                latestAIReply: { role, content, timestamp },
                updatedAt: timestamp,
              },
            }
          );
        } else {
          await chatCollection.updateOne(
            { _id: conversation._id },
            {
              $set: {
                latestAIReply: { role, content, timestamp },
                updatedAt: timestamp,
              },
            }
          );
        }
      }
    } else {
      if (role === "user") {
        await chatCollection.insertOne({
          firstUserPrompt: { role: "user", content, timestamp },
          latestUserPrompt: { role: "user", content, timestamp },
          layoutDetails: layoutDetails,
          layoutText: layoutText,
          createdAt: timestamp,
          updatedAt: timestamp,
        });
      } else if (role === "ai") {
        await chatCollection.insertOne({
          firstAIReply: { role: "ai", content, timestamp },
          latestAIReply: { role: "ai", content, timestamp },
          createdAt: timestamp,
          updatedAt: timestamp,
        });
      }
    }
  } catch (error) {
    console.error("Error appending message:", error);
  }
}

async function fetchPreviousContext() {
  try {
    const conversation = await chatCollection.findOne();

    if (conversation) {
      return {
        firstUserPrompt: conversation.firstUserPrompt || {},
        firstAIReply: conversation.firstAIReply || {},
        latestThread: {
          userPrompt: conversation.latestUserPrompt || {},
          aiReply: conversation.latestAIReply || {},
        },
      };
    }
    return {};
  } catch (error) {
    console.error("Error fetching previous context:", error);
    return {};
  }
}

module.exports = {
  appendMessage,
  fetchPreviousContext,
  initMongo,
};
