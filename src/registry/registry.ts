import bodyParser from "body-parser";
import express, { Request, Response } from "express";
import { REGISTRY_PORT } from "../config";

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

export async function launchRegistry() {
  const _registry = express();
  _registry.use(express.json());
  _registry.use(bodyParser.json());

  // Registry
  let nodeRegistry: Node[] = [];

  // /registerNode route
  _registry.post("/registerNode", async (req, res) => {

    const newNode: Node = {
      nodeId: req.body.nodeId,
      pubKey: req.body.pubKey,
    };

    nodeRegistry.push(newNode);

    res.status(200).send({ message: "Node registered successfully." });
  });


  // Route GET pour récupérer la clé privée d'un nœud
  _registry.get("/getNodeRegistry", (req, res) => {
    res.json({ nodes: nodeRegistry });
  });

  _registry.get("/status", (req, res) => {
    res.send("live");
  });

  const server = _registry.listen(REGISTRY_PORT, () => {
    console.log(`registry is listening on port ${REGISTRY_PORT}`);
  });

  return server;
}
