# a11y-analytics-e2e-demo

A full end-to-end demo of the a11y analytics ideas, using a custom analytics backend.

## Resetting the R2 Storage

The analytics data is stored in an R2 bucket.

To reset things to having no data stored, the current approach is to create a brand new R2 bucket and then integrate it in code. Here are the steps to do that

1. Create a new bucket named `a11y-analytics-e2e-demo-storage-N` replacing `N` with the next number (relative to the existing bucket's name)
2. Go to Settings > Public Access > R2.dev subdomain and hit Allow Access to allow public read-only access to the bucket
3. Create and merge a PR to update `wrangler.toml` to point to the new bucket's name

This is enough to have the demo start using the new bucket.


