## Summary

- 

## Checks

- [ ] Ran `npm run check`
- [ ] Ran `npm run test:ci` or listed the smaller checks that apply
- [ ] Ran `npm run test:smoke`
- [ ] Ran `npm run test:screenshots` or explained why browser automation could not run
- [ ] Ran `npm run test:booking-flow` when the booking UI changed
- [ ] Ran `npm run test:owner-role` when owner permissions changed
- [ ] Ran `npm run test:multi-shop-access` when route, shop, or permission behavior changed
- [ ] Checked customer page `/fah`
- [ ] Checked owner page `/fah-owner`
- [ ] Checked admin page `/admin`
- [ ] Checked new shop paths `/xxx` and `/xxx-owner` when routing is affected
- [ ] Added mobile/iPad screenshots when UI is affected
- [ ] Confirmed no shop-specific files are included accidentally
- [ ] Listed Supabase SQL that must be run, if any
- [ ] Updated `DESIGN.md` when UI rules, tokens, or frame depth changed
- [ ] Updated release/staging/database docs when workflow changed
- [ ] Ran `npm run monitor:production` after deploy or noted that this PR is not deployed yet
- [ ] Confirmed this PR does not expose customer PII in public pages, logs, screenshots, or docs

## Supabase SQL

Write `none` if this PR does not require SQL.

- 

## Deploy / Monitor

Write the deployment URL or `not deployed yet`.

-
