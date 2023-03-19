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
		return new Response(`
			<!DOCTYPE html>
			<html lang="en">
				<head>
					<title>E2E Analytics for Accessibility Demo</title>
					<meta name="description" content="An end-to-end demo of analytics for accessibility using a custom backend">
					<meta charset="UTF-8">
					<meta name="viewport" content="width=device-width, initial-scale=1.0">
				</head>
				<body>
					<main>
						<h1>This needs better text</h1>
					</main>
				</body>
			</html>
		`);
	},
};
