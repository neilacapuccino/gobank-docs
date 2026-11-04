// Stand-in market data for running GoBank's Bitcoin feature where the real
// market APIs (Binance, Binance.US, Frankfurter) cannot be reached, for example
// in a sandbox without internet. It is loaded BEFORE the app and replaces only
// those four requests; every other fetch goes to the real network.
//
// Fixed prices, so results can be checked by hand:
//   BTC/USDT 100,000.00 · USDT/USD mid 1.0000 · USD/PHP 58.50  →  ₱5,850,000.00
//
// Integration test (from the gobank folder of a checkout with a TEST database):
//   NODE_OPTIONS="--import ../../gobank-docs/experiments/mock-market.mjs" npm run test:bitcoin:integration
// Dev server with these prices:
//   NODE_OPTIONS="--import ../../gobank-docs/experiments/mock-market.mjs" npm run dev
// (Adjust the path to where this file is.) The browser's live WebSocket is NOT
// covered by this file; without it the screen falls back to the 15-second refresh.
//
const realFetch = globalThis.fetch;
const json = (value) =>
	new Response(JSON.stringify(value), {
		status: 200,
		headers: { "content-type": "application/json" },
	});

const INTERVAL_MS = { "1s": 1_000, "1m": 60_000, "1h": 3_600_000, "4h": 14_400_000, "1d": 86_400_000 };

function klines(interval, limit) {
	const step = INTERVAL_MS[interval] ?? 60_000;
	const now = Date.now();
	const lastOpen = Math.floor(now / step) * step;
	const rows = [];
	for (let i = limit - 1; i >= 0; i--) {
		const time = lastOpen - i * step;
		const wave = Math.sin((limit - i) / 6) * 400;
		const open = 99_600 + wave;
		const close = open + Math.cos((limit - i) / 4) * 150;
		const high = Math.max(open, close) + 60;
		const low = Math.min(open, close) - 60;
		rows.push([time, open.toFixed(2), high.toFixed(2), low.toFixed(2), close.toFixed(2), "12.5", time + step - 1]);
	}
	return rows;
}

globalThis.fetch = async (input, init) => {
	const url = String(typeof input === "string" ? input : input.url);
	if (url.includes("data-api.binance.vision/api/v3/ticker/24hr")) {
		return json({
			symbol: "BTCUSDT",
			lastPrice: "100000.00",
			openPrice: "98000.00",
			highPrice: "101000.00",
			lowPrice: "97500.00",
			volume: "12345.678",
			closeTime: Date.now() - 500,
		});
	}
	if (url.includes("api.binance.us/api/v3/ticker/bookTicker")) {
		return json({ symbol: "USDTUSD", bidPrice: "0.9998", askPrice: "1.0002" });
	}
	if (url.includes("api.frankfurter.dev/v2/rate/USD/PHP")) {
		return json({ date: new Date().toISOString().slice(0, 10), base: "USD", quote: "PHP", rate: 58.5 });
	}
	if (url.includes("data-api.binance.vision/api/v3/klines")) {
		const params = new URL(url).searchParams;
		return json(klines(params.get("interval"), Number(params.get("limit"))));
	}
	return realFetch(input, init);
};
