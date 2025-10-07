import bs58 from "bs58";
import { Keypair } from "@solana/web3.js";

export function keypairFromSecret(secret: string): Keypair {
  const trimmed = secret.trim();
  if (!trimmed) {
    throw new Error("Empty wallet secret provided");
  }
  try {
    const decoded = bs58.decode(trimmed);
    return Keypair.fromSecretKey(Uint8Array.from(decoded));
  } catch (err) {
    throw new Error(`Failed to decode wallet secret: ${(err as Error).message}`);
  }
}

export function keypairsFromSecrets(secrets: string[]): Keypair[] {
  return secrets.map((secret) => keypairFromSecret(secret));
}
