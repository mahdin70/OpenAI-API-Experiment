require("dotenv").config();
const { MongoClient } = require("mongodb");
const { getLayoutDetailsForPage, getTextFromLayoutForPage } = require("./pageExtractor.js");

const mongoUri = process.env.MONGO_URI;
const client = new MongoClient(mongoUri);

const dbName = "MagazineAIChatDatabase";
let db;
let chatCollection;

async function initMongo() {
  try {
    await client.connect();
    db = client.db(dbName);
    chatCollection = db.collection("PaginatedChatHistory");
    console.log("MongoDB connected and collection initialized.");
  } catch (error) {
    console.error("Error connecting to MongoDB", error);
  }
}

async function appendMessage(pageNumber, role, content) {
  try {
    const conversation = await chatCollection.findOne({ pageNumber });

    const timestamp = new Date();
    const layoutDetails = getLayoutDetailsForPage(pageNumber);
    const layoutText = getTextFromLayoutForPage(pageNumber);

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
        if (!conversation.firstAIReply) {
          await chatCollection.updateOne(
            { _id: conversation._id },
            {
              $set: {
                firstAIReply: { role, content, timestamp },
                latestAIReply: { role, content, timestamp },
                layoutDetails,
                layoutText,
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
      const newEntry = {
        pageNumber,
        firstUserPrompt: role === "user" ? { role, content, timestamp } : null,
        latestUserPrompt: role === "user" ? { role, content, timestamp } : null,
        firstAIReply: role === "ai" ? { role, content, timestamp } : null,
        latestAIReply: role === "ai" ? { role, content, timestamp } : null,
        layoutDetails,
        layoutText,
        createdAt: timestamp,
        updatedAt: timestamp,
      };

      await chatCollection.insertOne(newEntry);
    }
  } catch (error) {
    console.error("Error appending message:", error);
  }
}

async function fetchPreviousContext(pageNumber) {
  try {
    const conversation = await chatCollection.findOne({ pageNumber });

    if (conversation) {
      return {
        firstUserPrompt: conversation.firstUserPrompt || {},
        firstAIReply: conversation.firstAIReply || {},
        latestThread: {
          userPrompt: conversation.latestUserPrompt || {},
          aiReply: conversation.latestAIReply || {},
        },
        layoutDetails: conversation.layoutDetails || {},
        layoutText: conversation.layoutText || {},
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
