/**
 * Welcome to Cloudflare Workers! This is your first worker.
 *
 * - Run `npx wrangler dev src/index.js` in your terminal to start a development server
 * - Open a browser tab at http://localhost:8787/ to see your worker in action
 * - Run `npx wrangler publish src/index.js --name my-worker` to publish your worker
 *
 * Learn more at https://developers.cloudflare.com/workers/
 */

import { createId } from '@paralleldrive/cuid2';

export default {
	async fetch(request, env, ctx) {

		const url = new URL(request.url);

		if (url.pathname === '/') {
			return new Response(`
				<!DOCTYPE html>
				<html lang="en">
					<head>
						<script>
							console.log("Page loaded");

							navigator.sendBeacon("/analytics", JSON.stringify({
								clientKeyForBasicAbuseProtection: "clientKeyForBasicAbuseProtectionValue",
								pageLoad: true
							}));
						</script>
						<title>E2E Analytics for Accessibility Demo</title>
						<meta name="description" content="An end-to-end demo of analytics for accessibility using a custom backend">
						<meta charset="UTF-8">
						<meta name="viewport" content="width=device-width, initial-scale=1.0">
					</head>
					<body>
						<main>
							<h1>This needs better text</h1>
							<button id="conversion-button">Click to simulate a conversion</button>
						</main>
						<script>
							document.getElementById("conversion-button").addEventListener("click", () => {
								console.log("Button clicked");

								navigator.sendBeacon("/analytics", JSON.stringify({
									clientKeyForBasicAbuseProtection: "clientKeyForBasicAbuseProtectionValue",
									conversion: true
								}));
							})
						</script>
					</body>
				</html>
			`, {
				headers: {
					'Content-Type': 'text\\html'
				}
			});
		}

		if (url.pathname === '/analytics') {
			const bodyObj = await request.json();

			if (bodyObj.clientKeyForBasicAbuseProtection !== "clientKeyForBasicAbuseProtectionValue") {
				console.log(`Something other than the web client hit the /analytics endpoint. Request body: ${JSON.stringify(bodyObj)}`);

				return new Response('Forbidden', {
						status: 403,
						headers: {
							'Content-Type': 'text/plain'
						}
					}
				);
			}

			console.log(`request to /analytics with body: ${JSON.stringify(bodyObj)}`);

			await saveEventDataToR2(env, bodyObj);

			return new Response();
		}

		if (url.pathname === "/admin/analytics") {
			const durableObjectId = env.R2Cache.idFromName("r2cacheinstance");
			const stub = env.DURABLE_OBJECT_NAME.get(durableObjectId);
			const res = await stub.fetch("/rawAnalyticsData");
			const rawAnalyticsData = await res.json();
			
			console.log(`Raw analytics data: ${rawAnalyticsData}`);
		}

		throw new Error(`Unspecified route hit: ${request.url}`);
	}
};

async function saveEventDataToR2(env, eventData) {
	const foldersToSaveTo = ["allEvents"];

	if (eventData.pageLoad && typeof eventData.pageLoad === "boolean") {
		foldersToSaveTo.push("pageLoad");
	}

	if (eventData.conversion && typeof eventData.conversion === "boolean") {
		foldersToSaveTo.push("conversion");
	}

	const objectName = createId();

	for (const folder of foldersToSaveTo) {
		const key = `${folder}/${objectName}.json`;

		await env.BLOB_STORAGE.put(key, JSON.stringify(eventData));
	}
}

export class R2Cache {
	constructor(state, env) {}

	async fetch(request) {
		const url = new URL(request.url);

		if (url.pathname === "/rawAnalyticsData") {
			return new Response(JSON.stringify("Hello World"), {
				headers: {
					'Content-Type': "application/json"
				}
			});
		}

		throw new Error(`Unspecified route hit: ${request.url}`);
	}
}
  
