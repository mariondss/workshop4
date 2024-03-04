import bodyParser from "body-parser";
import express from "express";
import { BASE_ONION_ROUTER_PORT } from "../config";
import http from "http";
import { REGISTRY_PORT } from "../config";
import {generateRsaKeyPair, exportPubKey, exportPrvKey, rsaDecrypt, symDecrypt} from "../crypto";

export async function simpleOnionRouter(nodeId: number) {
  const onionRouter = express();
  onionRouter.use(express.json());
  onionRouter.use(bodyParser.json());

  // Generate a pair of RSA keys
  const { publicKey, privateKey } = await generateRsaKeyPair();

  // Convert key to a base64 string
  let privateKeyBase64 = await exportPrvKey(privateKey);
  let publicKeyBase64 = await exportPubKey(publicKey);

  // Register the node on the registry
  const data = JSON.stringify({
    nodeId,
    pubKey: publicKeyBase64,
  });

  const options = {
    hostname: 'localhost',
    port: REGISTRY_PORT,
    path: '/registerNode',
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Content-Length': data.length,
    },
  };

  const req = http.request(options, (res) => {
    res.on('data', (chunk) => {
      console.log(`Response: ${chunk}`);
    });
  });

  req.on('error', (error) => {
    console.error(`Error : ${error.message}`);
  });

  // Write data to request body
  req.write(data);
  req.end();

  // 2.1
  let lastReceivedEncryptedMessage: string | null = null;
  let lastReceivedDecryptedMessage: string | null = null;
  let lastMessageDestination: number | null = null;

  onionRouter.get("/getLastReceivedEncryptedMessage", (req, res) => {
    res.json({ result: lastReceivedEncryptedMessage });
  });

  onionRouter.get("/getLastReceivedDecryptedMessage", (req, res) => {
    res.json({ result: lastReceivedDecryptedMessage });
  });

  onionRouter.get("/getLastMessageDestination", (req, res) => {
    res.json({ result: lastMessageDestination });
  });

  onionRouter.get("/getPrivateKey", (req, res) => {
    res.json({ result: privateKeyBase64 });
  });

  // TODO implement the status route
  onionRouter.get("/status", (req, res) => {
    res.send("live");
  });

  onionRouter.post("/message", async (req, res) => {
    // Extract th encrypted message from the request body
    const {message} = req.body;
    // Decrypt the symmetric key (the first 344 characters) with our private key
    const decryptedKey = await rsaDecrypt(message.slice(0, 344), privateKey);
    // Decrypt the rest of the message with our symmetric key
    const decryptedMessage = await symDecrypt(decryptedKey, message.slice(344));
    // The first 10 characters of the decrypted message represent the identifier of the next destination in the network
    const nextDestination = parseInt(decryptedMessage.slice(0, 10), 10);
    // The rest of the message is extracted after these initial 10 characters.
    const remainingMessage = decryptedMessage.slice(10);

    // Update of the information
    lastReceivedEncryptedMessage = message;
    lastReceivedDecryptedMessage = remainingMessage;
    lastMessageDestination = nextDestination;

    // Sent these info to the next node in the anonymous network using an HTTP POST request to the URL corresponding to the next destination
    await fetch(`http://localhost:${nextDestination}/message`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({ message: remainingMessage }),
    });
    res.status(200).send("success");
  });

  const server = onionRouter.listen(BASE_ONION_ROUTER_PORT + nodeId, () => {
    console.log(
      `Onion router ${nodeId} is listening on port ${
        BASE_ONION_ROUTER_PORT + nodeId
      }`
    );
  });

  return server;
}
