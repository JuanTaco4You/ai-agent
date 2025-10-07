import { Connection, PublicKey } from "@solana/web3.js";

export type TokenAccountSnapshot = {
  pubkey: PublicKey;
  lamports: bigint;
  decimals: number;
};

export async function findFirstTokenAccount(
  connection: Connection,
  owner: PublicKey,
  mint: PublicKey,
  attempts = 3,
): Promise<PublicKey | null> {
  for (let i = 0; i < attempts; i += 1) {
    try {
      const accounts = await connection.getTokenAccountsByOwner(owner, {
        mint,
      });
      const first = accounts.value[0];
      if (first) {
        return first.pubkey;
      }
    } catch (err) {
      if (i === attempts - 1) {
        throw err;
      }
    }
  }
  return null;
}

export async function getTokenAccountSnapshot(
  connection: Connection,
  tokenAccount: PublicKey,
): Promise<TokenAccountSnapshot> {
  const balance = await connection.getTokenAccountBalance(tokenAccount);
  return {
    pubkey: tokenAccount,
    lamports: BigInt(balance.value.amount),
    decimals: balance.value.decimals,
  };
}
