/**
 * Welcome to Cloudflare Workers! This is your first worker.
 *
 * - Run `npx wrangler dev src/index.js` in your terminal to start a development server
 * - Open a browser tab at http://localhost:8787/ to see your worker in action
 * - Run `npx wrangler publish src/index.js --name my-worker` to publish your worker
 *
 * Learn more at https://developers.cloudflare.com/workers/
 */

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
			const body = await request.json();

			if (body.clientKeyForBasicAbuseProtection !== "clientKeyForBasicAbuseProtectionValue") {
				console.log(`Something other than the web client hit the /analytics endpoint. Request body: ${JSON.stringify(body)}`);

				return new Response('Forbidden', {
						status: 403,
						headers: {
							'Content-Type': 'text/plain'
						}
					}
				);
			}

			console.log(`request to /analytics with body: ${JSON.stringify(body)}`);

			return new Response();
		}

		throw new Error(`Unspecified route hit: ${request.url}`);
	}
};
