import bodyParser from "body-parser";
import express, { Request, Response } from "express";
import { REGISTRY_PORT } from "../config";
import { generateRsaKeyPair, exportPubKey } from "../crypto";

export type Node = {
  nodeId: number;
  pubKey: string
};

export type RegisterNodeBody = {
  nodeId: number;
  pubKey: string;
};

export type GetNodeRegistryBody = {
  nodes: Node[];
};

export type NodeWithPrivateKey = Node & { privateKey: string };

export async function launchRegistry() {
  const _registry = express();
  _registry.use(express.json());
  _registry.use(bodyParser.json());

  // Registry
  let nodeRegistry: Node[] = [];

  // /registerNode route
  _registry.post("/registerNode", async (req, res) => {
    const { nodeId, pubKey }: RegisterNodeBody = req.body;

    try {
      // Générer une paire de clés RSA pour le nœud
      const keyPair = await generateRsaKeyPair();
      // Exporter la clé publique en format base64
      const exportedPubKey = await exportPubKey(keyPair.publicKey);

      // Enregistrer le nœud sur le registre
      const newNode: Node = { nodeId, pubKey: exportedPubKey };
      nodeRegistry.push(newNode);

      return res.status(201).json({ message: "Node registered successfully", node: newNode });
    } catch (error) {
      console.error("Error registering node:", error);
      return res.status(500).json({ error: "Internal server error" });
    }
  });


  // Route GET pour récupérer la clé privée d'un nœud
  _registry.get("/getNodeRegistry", (req, res) => {
    const registry = { nodes: nodeRegistry };
    return res.json(registry);
  });

  _registry.get("/status", (req, res) => {
    res.send("live");
  });

  const server = _registry.listen(REGISTRY_PORT, () => {
    console.log(`registry is listening on port ${REGISTRY_PORT}`);
  });

  return server;
}
