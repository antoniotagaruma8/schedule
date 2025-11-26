const { MongoClient } = require('mongodb');
const cookie = require('cookie');
const signature = require('cookie-signature');

// The connection string for your MongoDB Atlas cluster, stored in Vercel Environment Variables
const uri = process.env.MONGODB_URI;

// Create a MongoClient instance. It's best practice to create it once and reuse it.
const client = new MongoClient(uri);

// Define the static ID for the single document that holds our schedule links.
const SCHEDULE_ID = 'antonio_master_schedule';

/**
 * Vercel Serverless Function to handle GET and PUT requests for the schedule.
 */
module.exports = async (req, res) => {
  // Ensure the MONGODB_URI is set in environment variables.
  if (!uri) {
    return res.status(500).json({ success: false, message: 'MONGODB_URI is not defined in environment variables.' });
  }

  try {
    // Connect to the MongoDB cluster.
    await client.connect();

    // Select the database and collection.
    const database = client.db('scheduleDB');
    const collection = database.collection('links');

    // Handle GET request to fetch the schedule.
    if (req.method === 'GET') {
      // Find the single document using the predefined ID.
      const scheduleDocument = await collection.findOne({ _id: SCHEDULE_ID });

      // If the document exists, return its 'links' field. Otherwise, return an empty object.
      const links = scheduleDocument ? scheduleDocument.links : {};
      return res.status(200).json({ links });
    }

    // Handle PUT request to update the schedule.
    if (req.method === 'PUT') {
      const { links } = req.body;

      // --- AUTHORIZATION CHECK ---
      const cookies = cookie.parse(req.headers.cookie || '');
      const sessionCookie = cookies.auth_session;
      const cookieSecret = process.env.COOKIE_SECRET;

      if (!sessionCookie || !cookieSecret) {
        return res.status(401).json({ success: false, message: 'Unauthorized: No session cookie.' });
      }

      // Verify the signature
      const unsignedSession = signature.unsign(sessionCookie, cookieSecret);
      if (!unsignedSession) {
        return res.status(401).json({ success: false, message: 'Unauthorized: Invalid session signature.' });
      }
      // --- END AUTHORIZATION CHECK ---

      if (typeof links === 'undefined') {
        return res.status(400).json({ success: false, message: 'Request body must contain a "links" object.' });
      }
      // Use updateOne with upsert:true. This will create the document if it doesn't exist,
      // or update it if it does. We use $set to replace the 'links' field entirely.
      await collection.updateOne(
        { _id: SCHEDULE_ID },
        { $set: { links: links } },
        { upsert: true }
      );

      // Return a success response.
      return res.status(200).json({ success: true, message: 'Links saved successfully.' });
    }

    // If the method is not GET or PUT, return a "Method Not Allowed" error.
    res.setHeader('Allow', ['GET', 'PUT']);
    return res.status(405).json({ success: false, message: `Method ${req.method} Not Allowed` });

  } catch (error) {
    // Catch any errors that occur during database operations.
    console.error('Database operation failed:', error);
    return res.status(500).json({ success: false, message: 'An error occurred while connecting to or interacting with the database.' });
  } finally {
    // The 'finally' block ensures that the client connection is always closed,
    // whether the operation succeeded or failed.
    await client.close();
  }
};