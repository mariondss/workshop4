import bodyParser from "body-parser";
import express from "express";
import { BASE_ONION_ROUTER_PORT, BASE_USER_PORT } from "../config";
import { createRandomSymmetricKey, symEncrypt, rsaEncrypt, exportSymKey} from "../crypto";
import {GetNodeRegistryBody, Node} from "@/src/registry/registry";

export type SendMessageBody = {
  message: string;
  destinationUserId: number;
};

export interface NodeRegistry {
  nodes: Node[];
}

export async function user(userId: number) {
  const _user = express();
  _user.use(express.json());
  _user.use(bodyParser.json());

  let lastReceivedMessage: string | null = null;
  let lastSentMessage: string | null = null;
  let lastCircuit: Node[] = [];

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

  _user.post("/message", (req, res) => {
    const message = req.body.message;

    lastReceivedMessage = message;

    console.log(`Received message: ${message}`);

    // Send a success response
    res.status(200).send("success");
  });

  _user.post("/sendMessage", async (req, res) => {
    // Extract the message
    const { message, destinationUserId } = req.body;

    // Retrieve the list of available nodes in the network
    const nodes = await fetch(`http://localhost:8080/getNodeRegistry`)//fetch the nodes list
        .then((res) => res.json() as Promise<GetNodeRegistryBody>)
        .then((body) => body.nodes);

    // Create a circuit of 3 nodes from the list of available nodes (randomly)
    let circuit: Node[] = [];
    while (circuit.length < 3) { //creates a 3 nodes circuit from the nodes list
      const randomNode = nodes[Math.floor(Math.random() * nodes.length)];
      if (!circuit.includes(randomNode)) {
        circuit.push(randomNode);
      }
    }

    // Prepare the message to be sent
    // The destination identifier is formatted with padding to reach a length of 10 characters.
    let destination = `${BASE_USER_PORT + destinationUserId}`.padStart(10, "0");
    let finalMessage = message;
    // Generate a symmetric key for each node
    for(const node of circuit) {
      const symmetricKey = await createRandomSymmetricKey();
      const symmetricKey64 = await exportSymKey(symmetricKey);
      const encryptedMessage = await symEncrypt(symmetricKey, `${destination + finalMessage}`);
      destination = `${BASE_ONION_ROUTER_PORT + node.nodeId}`.padStart(10, '0');
      const encryptedSymKey = await rsaEncrypt(symmetricKey64, node.pubKey);
      finalMessage = encryptedSymKey + encryptedMessage;
    }

    // Reverse the circuit to get the correct order of nodes
    circuit.reverse();
    lastCircuit = circuit;
    lastSentMessage = message;
    await fetch(`http://localhost:${BASE_ONION_ROUTER_PORT + circuit[0].nodeId}/message`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({ message: finalMessage }),
    });
    res.status(200).send("success");
  });

  const server = _user.listen(BASE_USER_PORT + userId, () => {
    console.log(
      `User ${userId} is listening on port ${BASE_USER_PORT + userId}`
    );
  });

  return server;
}