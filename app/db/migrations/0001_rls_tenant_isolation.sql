-- Row-Level Security: scope every tenant table to the venue in the per-request
-- `app.venue_id` session variable (set by runWithTenant). The owner role in
-- DATABASE_URL bypasses these policies (used for migrations, webhooks, owner
-- login); the restricted APP_DATABASE_URL role is subject to them.
--
-- NOT enabled here, by design:
--   venues            - public storefront, resolved by slug before any venue is known
--   venue_owners      - scanned by email at owner-login time (no venue context yet)
--   platform_admins   - global, not tenant-scoped
--   order_items, group_order_participants, staff_two_fa_tokens
--                     - no venue_id column (reached only via their RLS-protected
--                       parent); a later pass can add EXISTS-based child policies.
--
-- Idempotent: safe to re-run. `current_setting('app.venue_id', true)` returns
-- NULL when unset; NULLIF maps the empty-string scope to NULL so an unscoped
-- request matches no rows rather than erroring on an int cast.

DO $$
DECLARE
  t text;
  tenant_tables text[] := ARRAY[
    'abandoned_carts','audit_log','bundles','campaign_messages','catering_requests',
    'corporate_accounts','customer_accounts','customer_preferences','delivery_orders',
    'discount_codes','favourite_orders','franchisee_accounts','franchisee_payouts',
    'gift_cards','group_orders','inventory','locations','loyalty_accounts',
    'loyalty_rewards','loyalty_transactions','menu_item_modifiers','menu_items',
    'nps_responses','orders','pos_integrations','push_subscriptions','recurring_orders',
    'referral_codes','reservations','reviews','shift_swap_requests','staff_accounts',
    'staff_availability','staff_clock_events','staff_shifts','staff_training_completions',
    'staff_training_tasks','subscription_passes','time_off_requests','venue_tables',
    'waitlist_entries','waste_log','webhook_subscriptions','xero_connections'
  ];
BEGIN
  FOREACH t IN ARRAY tenant_tables LOOP
    EXECUTE format('ALTER TABLE %I ENABLE ROW LEVEL SECURITY', t);
    EXECUTE format('DROP POLICY IF EXISTS tenant_isolation ON %I', t);
    EXECUTE format(
      'CREATE POLICY tenant_isolation ON %I '
      'USING (venue_id = NULLIF(current_setting(''app.venue_id'', true), '''')::int) '
      'WITH CHECK (venue_id = NULLIF(current_setting(''app.venue_id'', true), '''')::int)',
      t
    );
  END LOOP;
END $$;
