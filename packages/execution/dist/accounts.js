"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.findFirstTokenAccount = findFirstTokenAccount;
exports.getTokenAccountSnapshot = getTokenAccountSnapshot;
async function findFirstTokenAccount(connection, owner, mint, attempts = 3) {
    for (let i = 0; i < attempts; i += 1) {
        try {
            const accounts = await connection.getTokenAccountsByOwner(owner, {
                mint,
            });
            const first = accounts.value[0];
            if (first) {
                return first.pubkey;
            }
        }
        catch (err) {
            if (i === attempts - 1) {
                throw err;
            }
        }
    }
    return null;
}
async function getTokenAccountSnapshot(connection, tokenAccount) {
    const balance = await connection.getTokenAccountBalance(tokenAccount);
    return {
        pubkey: tokenAccount,
        lamports: BigInt(balance.value.amount),
        decimals: balance.value.decimals,
    };
}
//# sourceMappingURL=accounts.js.map