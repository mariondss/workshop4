import { launchNetwork } from ".";
import {RegisterNodeBody} from "@/src/registry/registry";

function main() {

  async function createAndRegisterNodes(registryPort: number) {

    // Liste des nœuds à créer et enregistrer
    const nodesToRegister: RegisterNodeBody[] = [
      { nodeId: 1, pubKey: 'public_key_1' },
      { nodeId: 2, pubKey: 'public_key_2' },
      // Ajoutez d'autres nœuds ici si nécessaire
    ];

    // Array pour stocker les promesses des appels à fetch
    const fetchPromises: Promise<Response>[] = [];

    // Enregistrez chaque nœud dans le registre
    nodesToRegister.forEach((node) => {
      const fetchPromise = fetch(`http://localhost:${registryPort}/registerNode`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(node),
      });
      fetchPromises.push(fetchPromise);
    });

    // Attendre que toutes les promesses soient résolues
    await Promise.all(fetchPromises);
  }

// Appel de la fonction pour créer et enregistrer les nœuds au démarrage de l'application
  createAndRegisterNodes(8081)
      .then(() => console.log('Nodes registered successfully'))
      .catch((error) => console.error('Error registering nodes:', error));

  launchNetwork(10, 2);

}

main();
