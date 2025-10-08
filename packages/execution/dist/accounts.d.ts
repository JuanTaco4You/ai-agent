import { Connection, PublicKey } from "@solana/web3.js";
export type TokenAccountSnapshot = {
    pubkey: PublicKey;
    lamports: bigint;
    decimals: number;
};
export declare function findFirstTokenAccount(connection: Connection, owner: PublicKey, mint: PublicKey, attempts?: number): Promise<PublicKey | null>;
export declare function getTokenAccountSnapshot(connection: Connection, tokenAccount: PublicKey): Promise<TokenAccountSnapshot>;
