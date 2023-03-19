# a11y-analytics-e2e-demo

A full end-to-end demo of the a11y analytics ideas, using a custom analytics backend.

https://demo-with-custom-backend.grunet.workers.dev/ is the website for the demo referenced below.

## Generating Analytics

There are 4 ways to generate analytics

1. Loading the root `/` page
2. Clicking the button to simulate a conversion
3. Tabbing into the page (and waiting for 500ms for the analytics to detect you've done so)
4. Activating the button with the keyboard (e.g. an Enter press) to simulate a conversion

## Viewing the Aggregated Results

Navigating to the `/admin/analytics` page will show 2 pieces of information:

1. The ratio of the total number of click events on the button to the total number of page loads on `/`
2. The ratio of the total number of keyboard activation events on the button to the total number of Tab detection events

The idea here is that if the 2nd ratio is much smaller than the 1st ratio, it indicates a high likelihood of a keyboard accessibility problem.

## R2 Storage

The analytics data is stored in an R2 bucket.

## Viewing the R2 Storage

The R2 bucket should be publicly read-only.

To view an object you have to use the `*.r2.dev` URL for the bucket and navigate to an exact object by its prefix and name to view it.

## Resetting the R2 Storage

To reset things to having no data stored, the current approach is to create a brand new R2 bucket and then integrate it in code. Here are the steps to do that

1. Create a new bucket named `a11y-analytics-e2e-demo-storage-N` replacing `N` with the next number (relative to the existing bucket's name)
2. Go to Settings > Public Access > R2.dev subdomain and hit Allow Access to allow public read-only access to the bucket
3. Create and merge a PR to update `wrangler.toml` to point to the new bucket's name

This is enough to have the demo start using the new bucket.


