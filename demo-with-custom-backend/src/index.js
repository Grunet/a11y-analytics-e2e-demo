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
							let usesKeyboard = false;
						
							document.getElementById("conversion-button").addEventListener("click", () => {
								console.log("Button clicked");

								navigator.sendBeacon("/analytics", JSON.stringify({
									clientKeyForBasicAbuseProtection: "clientKeyForBasicAbuseProtectionValue",
									conversion: true,
									usesKeyboard: usesKeyboard,
								}));
							});
							
							try {
							    const intervalId = setInterval(function checkForKeyboardUsage() {

							    const focusedElement = document.querySelector(":focus-visible");

							    if (!focusedElement) {
								return;
							    }

							    // Ignore common false positives for click/touch users
							    const tagNameUpperCased = focusedElement.tagName.toUpperCase();
							    if (tagNameUpperCased === "INPUT" || tagNameUpperCased === "TEXTAREA") {
								return;
							    }

							    if (focusedElement.contentEditable === "true") {
								return;
							    }

							    usesKeyboard = true;
							    
							    navigator.sendBeacon("/analytics", JSON.stringify({
									clientKeyForBasicAbuseProtection: "clientKeyForBasicAbuseProtectionValue",
									usesKeyboard: true,
								}));

							    clearInterval(intervalId);
							}, 500);
						      } catch (error) {
							console.error(error);
						      }
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
			const stub = env.R2Cache.get(durableObjectId);
			const res = await stub.fetch(request); // Forwarding this as-is seems required. I tried doing other things but nothing worked.
			const rawAnalyticsData = await res.json();
			
			console.log(`Raw analytics data: ${JSON.stringify(rawAnalyticsData)}`);

			const { conversionRate, keyboardConversionRate } = computeConversionRates(rawAnalyticsData);
			
			return new Response(`Conversion rate is ${conversionRate}. Keyboard conversion rate is ${keyboardConversionRate}`);
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
	
	if (eventData.usesKeyboard && typeof eventData.usesKeyboard === "boolean") {
		foldersToSaveTo.push("usesKeyboard");
	}

	const objectName = createId();

	for (const folder of foldersToSaveTo) {
		const key = `${folder}/${objectName}.json`;

		await env.BLOB_STORAGE.put(key, JSON.stringify(eventData));
	}
}

function computeConversionRates(rawAnalyticsData) {
	const { eventsData } = rawAnalyticsData;

	let numPageLoads = 0;
	let numConversions = 0;
	
	let numKeyboardUsages = 0;
	let numKeyboardConversions = 0;

	for (const event of eventsData) {
		if (event.pageLoad === true) {
			numPageLoads++;
		}

		if (event.conversion === true) {
			numConversions++;
		}
		
		if (event.usesKeyboard === true && event.conversion !== true) {
			numKeyboardUsages++;
		}
		
		if (event.usesKeyboard === true && event.conversion === true) {
			numKeyboardConversions++;
		}
	}

	let conversionRate;
	if (numPageLoads === 0) {
		conversionRate = "Undefined";
	} else {
		conversionRate = numConversions/numPageLoads;
	}
	
	let keyboardConversionRate;
	if (numKeyboardUsages === 0) {
		keyboardConversionRate = "Undefined";
	} else {
		keyboardConversionRate = numKeyboardConversions/numKeyboardUsages;
	}

	return {
		conversionRate,
		keyboardConversionRate,
	}
}

export class R2Cache {
	constructor(state, env) {
		this.env = env;
	}

	async fetch(request) {
		const url = new URL(request.url);

		if (url.pathname === "/admin/analytics") {

			const list = await this.env.BLOB_STORAGE.list({
				prefix: "allEvents"
			});

			console.log(list);

			const allSettledRes = await Promise.allSettled(list.objects.map(async ({key}) => {
				const object = await this.env.BLOB_STORAGE.get(key);

				const json = await new Response(object.body).text();

				return json;
			}));
 
			const allDataAsArrayOfJsObjects = allSettledRes.filter(({value}) => !!value).map(({value}) => JSON.parse(value));

			const returnObj = {
				eventsData: allDataAsArrayOfJsObjects,
			};

			return new Response(JSON.stringify(returnObj), {
				headers: {
					'Content-Type': "application/json"
				}
			});
		}

		throw new Error(`Unspecified route hit: ${request.url}`);
	}
}
  
