import { launchNetwork } from ".";
import {RegisterNodeBody} from "@/src/registry/registry";

function main() {
  launchNetwork(10, 2);
}

main();
