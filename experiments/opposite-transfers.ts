// Experiment: fire transfers in BOTH directions at the same moment
// (@maricel → @dante and @dante → @maricel) and check that none of them
// deadlocks. Each transfer locks both users' rows; the ledger always locks
// them in ID order (ledger.ts lines 179–183), so two opposite transfers can
// never each hold the row the other one is waiting for.
//
// Run it from a GoBank Express checkout that has a migrated, seeded TEST database
// (it moves real rows in that database, so never point it at a database you care about):
//
//   cp ../gobank-docs/experiments/opposite-transfers.ts gobank/scripts/
//   cd gobank
//   node --conditions=react-server --import tsx scripts/opposite-transfers.ts
//
// It uses the two seeded demo accounts, @maricel and @dante. Both need at least
// ₱10 of balance and of daily card limit left.

import "dotenv/config";
import { db } from "../src/server/db";
import { sendMoney } from "../src/features/transfers/transfers.service";

const EACH_WAY = 10;
const AMOUNT_CENTAVOS = 100;

const account = (username: string) =>
	db.user.findUniqueOrThrow({
		where: { username },
		select: { id: true, balance: true },
	});

try {
	const maricel = await account("maricel");
	const dante = await account("dante");
	const totalBefore = maricel.balance + dante.balance;

	const startedAt = Date.now();
	const results = await Promise.allSettled(
		Array.from({ length: EACH_WAY * 2 }, (_, index) =>
			index % 2 === 0
				? sendMoney(maricel.id, "@dante", AMOUNT_CENTAVOS, null, "physical")
				: sendMoney(dante.id, "@maricel", AMOUNT_CENTAVOS, null, "physical"),
		),
	);
	const elapsed = Date.now() - startedAt;

	const failures = results.flatMap((result) =>
		result.status === "rejected"
			? [result.reason instanceof Error ? result.reason.message : "unknown"]
			: [],
	);
	const deadlocks = failures.filter((message) => /deadlock/i.test(message));

	const maricelAfter = await account("maricel");
	const danteAfter = await account("dante");
	const totalAfter = maricelAfter.balance + danteAfter.balance;

	console.log(`Fired at once:          ${EACH_WAY} each way (${EACH_WAY * 2} transfers of ${AMOUNT_CENTAVOS})`);
	console.log(`Succeeded:              ${results.length - failures.length}`);
	console.log(`Failed:                 ${failures.length} (deadlocks: ${deadlocks.length})`);
	for (const message of new Set(failures)) console.log(`  - ${message}`);
	console.log(`@maricel before/after:  ${maricel.balance} / ${maricelAfter.balance}`);
	console.log(`@dante before/after:    ${dante.balance} / ${danteAfter.balance}`);
	console.log(`Money before / after:   ${totalBefore} / ${totalAfter}`);
	console.log(`Took:                   ${elapsed} ms`);
	console.log(
		failures.length === 0 &&
			maricelAfter.balance === maricel.balance &&
			danteAfter.balance === dante.balance
			? "PASS: no deadlock; equal amounts both ways left both balances unchanged."
			: "FAIL",
	);
} finally {
	await db.$disconnect();
}
