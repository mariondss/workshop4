import bodyParser from "body-parser";
import express from "express";
import { BASE_USER_PORT } from "../config";

export type SendMessageBody = {
  message: string;
  destinationUserId: number;
};

export async function user(userId: number) {
  const _user = express();
  _user.use(express.json());
  _user.use(bodyParser.json());

  let lastReceivedMessage: string | null = null;
  let lastSentMessage: string | null = null;

  _user.get("/getLastReceivedMessage", (req, res) => {
    res.json({ result: lastReceivedMessage });
  });

  _user.get("/getLastSentMessage", (req, res) => {
    res.json({ result: lastSentMessage });
  });

  // TODO implement the status route
  _user.get("/status", (req, res) => {
    res.send("live");
  });

  // Route pour recevoir les messages
  _user.post("/message", (req, res) => {
    const { message } = req.body;
    console.log(message);
  });

  _user.get("/getLastReceivedMessage", (req, res) => {
    // Récupérer et renvoyer le dernier message reçu par l'utilisateur
    res.json({ message: lastReceivedMessage });
  });


  const server = _user.listen(BASE_USER_PORT + userId, () => {
    console.log(
      `User ${userId} is listening on port ${BASE_USER_PORT + userId}`
    );
  });

  return server;
}