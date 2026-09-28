import { mkdir, readFile, writeFile } from "node:fs/promises";
import { resolve } from "node:path";
import { Contract, ContractFactory, JsonRpcProvider, Wallet, type Provider, type Signer } from "ethers";
import { network } from "hardhat";

const localNetwork = "hardhatMainnet";
const rpcUrl = process.env.RPC_URL?.trim();
let provider: Provider;
let deployer: Signer;
let networkName = localNetwork;

if (rpcUrl) {
  const jsonRpcProvider = new JsonRpcProvider(rpcUrl);
  provider = jsonRpcProvider;
  deployer = process.env.PRIVATE_KEY
    ? new Wallet(process.env.PRIVATE_KEY, jsonRpcProvider)
    : await jsonRpcProvider.getSigner(0);
  networkName = process.env.NETWORK_NAME?.trim() || "local-rpc";
} else {
  const connection = await network.create({ network: localNetwork });
  const signers = await connection.ethers.getSigners();
  if (signers.length === 0) throw new Error("No deployer signer is available on the selected local network.");
  deployer = signers[0];
  provider = connection.ethers.provider;
}

const chain = await provider.getNetwork();
const deployerAddress = await deployer.getAddress();

async function loadArtifact(name: string) {
  const directory = name === "TenderGuard" ? "TenderGuard.sol" : `${name}.sol`;
  return JSON.parse(await readFile(resolve(process.cwd(), `artifacts/contracts/${directory}/${name}.json`), "utf8"));
}

async function deployContract(name: string, arguments_: unknown[] = []) {
  const artifact = await loadArtifact(name);
  const factory = new ContractFactory(artifact.abi, artifact.bytecode, deployer);
  const contract = await factory.deploy(...arguments_);
  const transaction = contract.deploymentTransaction();
  if (!transaction) throw new Error(`No deployment transaction found for ${name}.`);
  await contract.waitForDeployment();
  return { contract, transactionHash: transaction.hash };
}

async function confirmedTransactionHash(transaction: {
  hash: string;
  wait: () => Promise<{ status: number | null } | null>;
}, label: string): Promise<string> {
  const receipt = await transaction.wait();
  if (!receipt || receipt.status !== 1) {
    throw new Error(`${label} transaction did not succeed: ${transaction.hash}`);
  }
  return transaction.hash;
}

console.log(`Deploying TenderGuard contracts to ${networkName} (chain ID ${chain.chainId})`);
console.log(`Deployer: ${deployerAddress}`);

const registryDeploymentResult = await deployContract("SupplierRegistry");
const registryAddress = await registryDeploymentResult.contract.getAddress();
const tenderGuardDeploymentResult = await deployContract("TenderGuard", [registryAddress]);
const tenderGuardAddress = await tenderGuardDeploymentResult.contract.getAddress();
const escrowDeploymentResult = await deployContract("ProcurementEscrow", [tenderGuardAddress, registryAddress]);
const escrowAddress = await escrowDeploymentResult.contract.getAddress();

const registryArtifact = await loadArtifact("SupplierRegistry");
const supplierRegistry = new Contract(registryAddress, registryArtifact.abi, deployer);
const tenderGuardAuthorizationTx = await supplierRegistry.setAuthorizedContract(tenderGuardAddress, true);
const tenderGuardAuthorization = await confirmedTransactionHash(
  tenderGuardAuthorizationTx,
  "TenderGuard registry authorization",
);
const escrowAuthorizationTx = await supplierRegistry.setAuthorizedContract(escrowAddress, true);
const escrowAuthorization = await confirmedTransactionHash(
  escrowAuthorizationTx,
  "ProcurementEscrow registry authorization",
);

const tenderGuardAuthorized = await supplierRegistry.authorizedContracts(tenderGuardAddress);
const escrowAuthorized = await supplierRegistry.authorizedContracts(escrowAddress);
if (!tenderGuardAuthorized || !escrowAuthorized) {
  throw new Error("Registry authorization verification failed.");
}

const deployment = {
  network: networkName,
  chainId: chain.chainId.toString(),
  deployer: deployerAddress,
  SupplierRegistry: registryAddress,
  TenderGuard: tenderGuardAddress,
  ProcurementEscrow: escrowAddress,
  deployedAt: new Date().toISOString(),
  transactions: {
    registryDeployment: registryDeploymentResult.transactionHash,
    tenderGuardDeployment: tenderGuardDeploymentResult.transactionHash,
    escrowDeployment: escrowDeploymentResult.transactionHash,
    registryTenderGuardAuthorization: tenderGuardAuthorization,
    registryEscrowAuthorization: escrowAuthorization,
  },
};

const deploymentsDirectory = resolve(process.cwd(), "deployments");
await mkdir(deploymentsDirectory, { recursive: true });
await writeFile(
  resolve(deploymentsDirectory, "local.json"),
  `${JSON.stringify(deployment, null, 2)}\n`,
  "utf8",
);

console.log("\nDeployment complete; registry permissions verified.");
console.log(JSON.stringify(deployment, null, 2));
