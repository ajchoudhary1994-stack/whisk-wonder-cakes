# Deploy on Cloudflare Pages (free)

You need: a GitHub repo with this project, and a free Cloudflare account. A phone works (use "Desktop site").

1. Put the project in the GitHub repo so that `site/` and `functions/` are at the top level of the repo.
2. Cloudflare dashboard > Workers & Pages > Create application > Pages > Connect to Git. Pick the repo.
3. Build settings: Framework preset None. Build command: leave empty. Build output directory: `site`. Root directory: leave empty. Save and Deploy.
4. Create the database: Storage & databases > D1 > Create database (use the database name and ID configured in `wrangler.toml`, or update that file to match). No manual table creation is required: the function creates `kv` on first use. For controlled schema setup, apply the migration from a machine with Wrangler configured: `npx wrangler d1 migrations apply whisk-wonder-rewards --remote`.
5. In your Pages project: Settings > Bindings > Add > D1 database. Variable name `DB`. Pick the database. Save.
6. Settings > Variables and secrets > Add. Name `REWARDS_SECRET`, type Secret, a random value of 40+ characters. Add `NTFY_TOPIC` and `NTFY_TOKEN` together if you use ntfy; without `NTFY_TOKEN`, the topic is not access-controlled. Add the Brevo variables from the README if email automation is enabled.
7. Deployments > the latest deployment > Retry deployment (or push any small change). Bindings and variables only apply to a new deployment.
8. Test: open `https://YOUR-PROJECT.pages.dev/api/rewards`. A plain "Not found." means the function works. Then place a test order.
9. Custom domain: project > Custom domains > Set up a domain. Make `www.whiskandwondercakes.in` the main one. Move the domain's DNS to Cloudflare if asked.
10. Search Console: submit `sitemap.xml` again after the domain moves.

Free plan limits to know: Pages Functions allow 100,000 requests a day. Static files are free and not counted. D1 free tier is far above what a bakery needs.
