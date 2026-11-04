// Experiment: fire many transfers at the same moment and prove the ledger
// never overdraws an account and never creates or loses money.
//
// Run it from a GoBank Express checkout that has a migrated, seeded TEST database
// (it moves real rows in that database, so never point it at a database you care about):
//
//   cp ../gobank-docs/experiments/concurrent-transfers.ts gobank/scripts/
//   cd gobank
//   node --conditions=react-server --import tsx scripts/concurrent-transfers.ts
//
// It uses the two seeded demo accounts, @maricel and @dante.

import "dotenv/config";
import { db } from "../src/server/db";
import { sendMoney } from "../src/features/transfers/transfers.service";

const PARALLEL_TRANSFERS = 20;
const AMOUNT_CENTAVOS = 40_000;

const account = (username: string) =>
	db.user.findUniqueOrThrow({
		where: { username },
		select: { id: true, balance: true, cardDailyLimit: true },
	});

try {
	const sender = await account("maricel");
	const receiver = await account("dante");
	const totalBefore = sender.balance + receiver.balance;

	const affordable = Math.min(
		Math.floor(sender.balance / AMOUNT_CENTAVOS),
		Math.floor(sender.cardDailyLimit / AMOUNT_CENTAVOS),
		PARALLEL_TRANSFERS,
	);

	const results = await Promise.allSettled(
		Array.from({ length: PARALLEL_TRANSFERS }, () =>
			sendMoney(sender.id, "@dante", AMOUNT_CENTAVOS, null, "physical"),
		),
	);

	const succeeded = results.filter((result) => result.status === "fulfilled");
	const reasons = new Map<string, number>();
	for (const result of results) {
		if (result.status === "rejected") {
			const message =
				result.reason instanceof Error ? result.reason.message : "unknown";
			reasons.set(message, (reasons.get(message) ?? 0) + 1);
		}
	}

	const senderAfter = await account("maricel");
	const receiverAfter = await account("dante");
	const totalAfter = senderAfter.balance + receiverAfter.balance;

	console.log(`Sender balance before:  ${sender.balance} centavos`);
	console.log(`Fired at once:          ${PARALLEL_TRANSFERS} transfers of ${AMOUNT_CENTAVOS}`);
	console.log(`Affordable at most:     ${affordable}`);
	console.log(`Succeeded:              ${succeeded.length}`);
	for (const [reason, count] of reasons) {
		console.log(`Refused (${count}):          ${reason}`);
	}
	console.log(`Sender balance after:   ${senderAfter.balance} centavos`);
	console.log(`Money before / after:   ${totalBefore} / ${totalAfter}`);
	console.log(
		succeeded.length <= affordable &&
			senderAfter.balance >= 0 &&
			totalBefore === totalAfter
			? "PASS: no overdraft, no money created or lost."
			: "FAIL",
	);
} finally {
	await db.$disconnect();
}
