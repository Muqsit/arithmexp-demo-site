# arithmexp-demo-site
Next.js demo site for Muqsit/arithmexp deployed on [Cloudflare Pages](https://pages.cloudflare.com/).

## Deployment
- Visit the Cloudflare Pages Portal and create a Next.js project. As this Next.js site contains server-side rendering, make sure you select the non-static Next.js site option.
- Configure the following environment variables:
  Name | Value
  -----|----
  `NODE_VERSION` | `16`
  `ARITHMEXP_EVALUATOR` | `https://example.com/your_arithmexp_evaluator.php`
- Go to the Pages project settings page (Settings > Functions > Compatibility Flags), add the `nodejs_compat` flag.
