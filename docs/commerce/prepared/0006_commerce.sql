-- Collective commerce extension. PostgreSQL ONLY. CANDIDATE: apply after current 0000 through 0005; not registered for deployment.
CREATE TABLE commerce_shops (
  shop text PRIMARY KEY CHECK (shop ~ '^[a-z0-9][a-z0-9-]*\.myshopify\.com$'),
  status text NOT NULL DEFAULT 'active' CHECK(status IN ('active','uninstalled','paused')),
  reconciled_at timestamptz, reconcile_started_at timestamptz, created_at timestamptz NOT NULL DEFAULT now()
);
--> statement-breakpoint
CREATE TABLE commerce_tiers (
  shop text NOT NULL REFERENCES commerce_shops, id text NOT NULL, name text NOT NULL,
  PRIMARY KEY(shop,id)
);
--> statement-breakpoint
CREATE TABLE commerce_rules (
  shop text NOT NULL REFERENCES commerce_shops, id text NOT NULL, name text NOT NULL,
  basis_points integer NOT NULL CHECK(basis_points BETWEEN 0 AND 10000),
  hold_days integer NOT NULL CHECK(hold_days BETWEEN 1 AND 365),
  starts_at timestamptz NOT NULL, ends_at timestamptz, created_by text NOT NULL,
  CHECK(ends_at IS NULL OR ends_at > starts_at), PRIMARY KEY(shop,id)
);
--> statement-breakpoint
CREATE TABLE commerce_ambassadors (
  shop text NOT NULL REFERENCES commerce_shops, id text NOT NULL, member_id text NOT NULL REFERENCES members(user_id),
  status text NOT NULL DEFAULT 'active' CHECK(status IN ('active','suspended')),
  shopify_customer_id text, tier_id text, rule_id text NOT NULL, created_at timestamptz NOT NULL DEFAULT now(),
  PRIMARY KEY(shop,id), UNIQUE(shop,member_id),
  FOREIGN KEY(shop,tier_id) REFERENCES commerce_tiers(shop,id), FOREIGN KEY(shop,rule_id) REFERENCES commerce_rules(shop,id)
);
--> statement-breakpoint
-- Offers are Shopify-owned discounts. Their values NEVER determine commission rates.
CREATE TABLE commerce_offers (
  shop text NOT NULL REFERENCES commerce_shops, id text NOT NULL,
  purpose text NOT NULL CHECK(purpose IN ('customer','barber_backbar')),
  shopify_discount_id text NOT NULL, description text NOT NULL, PRIMARY KEY(shop,id)
);
--> statement-breakpoint
CREATE TABLE commerce_codes (
  shop text NOT NULL, code text NOT NULL CHECK(code ~ '^[A-Z0-9][A-Z0-9_-]{2,63}$'),
  ambassador_id text NOT NULL, offer_id text NOT NULL,
  starts_at timestamptz NOT NULL, ends_at timestamptz,
  PRIMARY KEY(shop,code), FOREIGN KEY(shop,ambassador_id) REFERENCES commerce_ambassadors(shop,id),
  FOREIGN KEY(shop,offer_id) REFERENCES commerce_offers(shop,id), CHECK(ends_at IS NULL OR ends_at > starts_at)
);
--> statement-breakpoint
CREATE TABLE commerce_touchpoints (
  shop text NOT NULL, id text NOT NULL, ambassador_id text NOT NULL,
  kind text NOT NULL CHECK(kind IN ('discount_code','referral_link','qr','campaign','customer_relationship','assisted')),
  reference text NOT NULL, customer_id text, campaign_id text, evidence jsonb NOT NULL,
  occurred_at timestamptz NOT NULL, expires_at timestamptz, created_by text NOT NULL,
  PRIMARY KEY(shop,id), FOREIGN KEY(shop,ambassador_id) REFERENCES commerce_ambassadors(shop,id)
);
--> statement-breakpoint
CREATE TABLE commerce_orders (
  shop text NOT NULL REFERENCES commerce_shops, id text NOT NULL, snapshot jsonb NOT NULL,
  updated_at timestamptz NOT NULL, fetched_at timestamptz NOT NULL, fingerprint text NOT NULL,
  ambassador_id text, rule_snapshot jsonb, attribution_snapshot jsonb,
  currency text NOT NULL CHECK(currency ~ '^[A-Z]{3}$'), base_minor bigint NOT NULL CHECK(base_minor >= 0),
  target_minor bigint NOT NULL DEFAULT 0 CHECK(target_minor >= 0),
  hold_reason text, release_at timestamptz,
  PRIMARY KEY(shop,id), FOREIGN KEY(shop,ambassador_id) REFERENCES commerce_ambassadors(shop,id)
);
--> statement-breakpoint
CREATE TABLE commerce_ledger (
  id bigserial PRIMARY KEY, shop text NOT NULL, order_id text NOT NULL, ambassador_id text NOT NULL,
  currency text NOT NULL, delta_minor bigint NOT NULL CHECK(delta_minor <> 0),
  revision text NOT NULL, rule_snapshot jsonb NOT NULL, reason text NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE(shop,order_id,revision), FOREIGN KEY(shop,order_id) REFERENCES commerce_orders(shop,id),
  FOREIGN KEY(shop,ambassador_id) REFERENCES commerce_ambassadors(shop,id)
);
--> statement-breakpoint
CREATE TABLE commerce_receipts (
  id bigserial PRIMARY KEY, shop text NOT NULL REFERENCES commerce_shops, delivery_id text NOT NULL, topic text NOT NULL,
  event_id text, resource_id text, payload jsonb NOT NULL DEFAULT '{}',
  state text NOT NULL DEFAULT 'pending' CHECK(state IN ('pending','processing','done','dead')),
  attempts integer NOT NULL DEFAULT 0, available_at timestamptz NOT NULL DEFAULT now(),
  lease_token text, lease_until timestamptz, error_code text,
  received_at timestamptz NOT NULL DEFAULT now(), completed_at timestamptz,
  UNIQUE(shop,delivery_id,topic)
);
--> statement-breakpoint
CREATE INDEX commerce_queue_ready ON commerce_receipts(state,available_at);
--> statement-breakpoint
CREATE TABLE commerce_resources (
  shop text NOT NULL REFERENCES commerce_shops, kind text NOT NULL, id text NOT NULL,
  document jsonb NOT NULL, synced_at timestamptz NOT NULL DEFAULT now(), deleted_at timestamptz,
  PRIMARY KEY(shop,kind,id)
);
--> statement-breakpoint
CREATE TABLE commerce_sync_runs (
  shop text NOT NULL REFERENCES commerce_shops, id text NOT NULL,
  state text NOT NULL DEFAULT 'running' CHECK(state IN ('running','done','failed')),
  started_at timestamptz NOT NULL DEFAULT now(), completed_at timestamptz,
  PRIMARY KEY(shop,id)
);
--> statement-breakpoint
CREATE TABLE commerce_disputes (
  shop text NOT NULL, id text NOT NULL, order_id text NOT NULL, status text NOT NULL,
  updated_at timestamptz NOT NULL DEFAULT now(), PRIMARY KEY(shop,id),
  FOREIGN KEY(shop) REFERENCES commerce_shops
);
--> statement-breakpoint
CREATE TABLE commerce_payout_batches (
  shop text NOT NULL REFERENCES commerce_shops, id text NOT NULL, currency text NOT NULL,
  state text NOT NULL DEFAULT 'approved' CHECK(state IN ('approved','paid','void')),
  created_by text NOT NULL, created_at timestamptz NOT NULL DEFAULT now(),
  paid_at timestamptz, payment_reference text, PRIMARY KEY(shop,id), UNIQUE(shop,payment_reference)
);
--> statement-breakpoint
CREATE TABLE commerce_payout_items (
  shop text NOT NULL, batch_id text NOT NULL, ambassador_id text NOT NULL,
  amount_minor bigint NOT NULL CHECK(amount_minor > 0),
  PRIMARY KEY(shop,batch_id,ambassador_id),
  FOREIGN KEY(shop,batch_id) REFERENCES commerce_payout_batches(shop,id),
  FOREIGN KEY(shop,ambassador_id) REFERENCES commerce_ambassadors(shop,id)
);
--> statement-breakpoint
CREATE TABLE commerce_audit (
  id bigserial PRIMARY KEY, shop text NOT NULL REFERENCES commerce_shops, actor text NOT NULL,
  action text NOT NULL, subject text NOT NULL, detail jsonb NOT NULL, created_at timestamptz NOT NULL DEFAULT now()
);
--> statement-breakpoint
CREATE FUNCTION commerce_immutable() RETURNS trigger LANGUAGE plpgsql AS $$
BEGIN RAISE EXCEPTION 'Append-only record: corrections require a new entry'; END $$;
--> statement-breakpoint
CREATE TRIGGER commerce_ledger_immutable BEFORE UPDATE OR DELETE ON commerce_ledger FOR EACH ROW EXECUTE FUNCTION commerce_immutable();
--> statement-breakpoint
CREATE TRIGGER commerce_rules_immutable BEFORE UPDATE OR DELETE ON commerce_rules FOR EACH ROW EXECUTE FUNCTION commerce_immutable();
--> statement-breakpoint
CREATE TRIGGER commerce_audit_immutable BEFORE UPDATE OR DELETE ON commerce_audit FOR EACH ROW EXECUTE FUNCTION commerce_immutable();
--> statement-breakpoint

-- A shop-row lock serializes financial changes and payouts. Safe for concurrent serverless invocations.
CREATE FUNCTION commerce_apply_order(p_shop text, s jsonb) RETURNS text LANGUAGE plpgsql AS $$
DECLARE old commerce_orders%ROWTYPE; a commerce_ambassadors%ROWTYPE; r commerce_rules%ROWTYPE;
  candidates text[]; attribution jsonb; rule jsonb; target bigint := 0; previous bigint := 0;
  hold text := s->>'hold'; release timestamptz; delta bigint; aid text;
BEGIN
  PERFORM 1 FROM commerce_shops WHERE shop=p_shop AND status='active' FOR UPDATE;
  IF NOT FOUND THEN RAISE EXCEPTION 'Shop is not active'; END IF;
  SELECT * INTO old FROM commerce_orders WHERE shop=p_shop AND id=s->>'id';
  IF FOUND THEN
    IF (s->>'updatedAt')::timestamptz < old.updated_at OR (s->>'fetchedAt')::timestamptz < old.fetched_at THEN RETURN 'stale'; END IF;
    aid := old.ambassador_id; rule := old.rule_snapshot; attribution := old.attribution_snapshot;
    previous := old.target_minor; release := old.release_at;
    IF old.currency <> s->>'currency' THEN RAISE EXCEPTION 'Order currency changed; manual review required'; END IF;
  END IF;
  IF aid IS NULL THEN
    SELECT array_agg(DISTINCT c.ambassador_id) INTO candidates FROM commerce_codes c
    JOIN commerce_offers o ON o.shop=c.shop AND o.id=c.offer_id AND o.purpose='customer'
    JOIN commerce_ambassadors ca ON ca.shop=c.shop AND ca.id=c.ambassador_id AND ca.status='active'
    WHERE c.shop=p_shop AND c.code IN (SELECT jsonb_array_elements_text(s->'codes'))
      AND c.starts_at <= (s->>'createdAt')::timestamptz AND (c.ends_at IS NULL OR c.ends_at > (s->>'createdAt')::timestamptz);
    IF cardinality(candidates)=1 THEN
      aid := candidates[1]; attribution := jsonb_build_object('kind','discount_code','codes',s->'codes','policy','code-v1');
    ELSIF cardinality(candidates)>1 THEN hold := 'ambiguous_attribution';
    ELSE hold := coalesce(hold,'unattributed'); END IF;
    IF aid IS NOT NULL THEN
      SELECT * INTO a FROM commerce_ambassadors WHERE shop=p_shop AND id=aid;
      SELECT * INTO r FROM commerce_rules WHERE shop=p_shop AND id=a.rule_id;
      IF r.starts_at > (s->>'createdAt')::timestamptz OR (r.ends_at IS NOT NULL AND r.ends_at <= (s->>'createdAt')::timestamptz) THEN
        aid := NULL; hold := 'no_effective_rule';
      ELSE rule := to_jsonb(r); release := now() + make_interval(days => r.hold_days); END IF;
    END IF;
  END IF;
  IF aid IS NOT NULL THEN
    IF EXISTS(SELECT 1 FROM commerce_ambassadors WHERE shop=p_shop AND id=aid AND shopify_customer_id=s->>'customerId') THEN hold := 'self_purchase_review'; END IF;
    IF EXISTS(SELECT 1 FROM commerce_codes c JOIN commerce_offers o ON o.shop=c.shop AND o.id=c.offer_id
      WHERE c.shop=p_shop AND o.purpose='barber_backbar' AND c.code IN (SELECT jsonb_array_elements_text(s->'codes'))) THEN hold := 'backbar_purchase'; END IF;
    target := floor(((s->>'base')::numeric * (rule->>'basis_points')::integer + 5000)/10000)::bigint;
    -- Hold future eligibility for suspended ambassadors; never erase earned history.
    IF EXISTS(SELECT 1 FROM commerce_ambassadors WHERE shop=p_shop AND id=aid AND status='suspended') THEN hold := 'ambassador_suspended'; END IF;
    IF EXISTS(SELECT 1 FROM members m JOIN commerce_ambassadors ca ON ca.member_id=m.user_id WHERE ca.shop=p_shop AND ca.id=aid AND m.status<>'active') THEN hold := 'membership_suspended'; END IF;
    IF EXISTS(SELECT 1 FROM commerce_disputes WHERE shop=p_shop AND order_id=s->>'id' AND status NOT IN ('WON','ACCEPTED','LOST')) THEN hold := 'dispute_open'; END IF;
    -- A lost/accepted dispute is held for amount allocation, not guessed as a full-order loss.
    IF EXISTS(SELECT 1 FROM commerce_disputes WHERE shop=p_shop AND order_id=s->>'id' AND status IN ('LOST','ACCEPTED')) THEN hold := 'dispute_loss_review'; END IF;
    IF old.hold_reason='payment_not_settled' AND hold IS NULL THEN release := now() + make_interval(days => (rule->>'hold_days')::integer); END IF;
    IF target > previous THEN release := greatest(coalesce(release,now()), now() + make_interval(days => (rule->>'hold_days')::integer)); END IF;
  END IF;
  INSERT INTO commerce_orders(shop,id,snapshot,updated_at,fetched_at,fingerprint,ambassador_id,rule_snapshot,attribution_snapshot,currency,base_minor,target_minor,hold_reason,release_at)
  VALUES(p_shop,s->>'id',s,(s->>'updatedAt')::timestamptz,(s->>'fetchedAt')::timestamptz,s->>'fingerprint',aid,rule,attribution,s->>'currency',(s->>'base')::bigint,target,hold,release)
  ON CONFLICT(shop,id) DO UPDATE SET snapshot=excluded.snapshot, updated_at=excluded.updated_at,fetched_at=excluded.fetched_at,fingerprint=excluded.fingerprint,
    ambassador_id=excluded.ambassador_id,rule_snapshot=excluded.rule_snapshot,attribution_snapshot=excluded.attribution_snapshot,
    base_minor=excluded.base_minor,target_minor=excluded.target_minor,hold_reason=excluded.hold_reason,release_at=excluded.release_at;
  delta := target-previous;
  IF delta<>0 THEN
    INSERT INTO commerce_ledger(shop,order_id,ambassador_id,currency,delta_minor,revision,rule_snapshot,reason)
    VALUES(p_shop,s->>'id',aid,s->>'currency',delta,(s->>'fingerprint') || ':' || (s->>'fetchedAt'),rule,
      CASE WHEN previous=0 AND delta>0 THEN 'accrual' WHEN delta<0 THEN 'refund_or_order_adjustment' ELSE 'order_adjustment' END);
  END IF;
  RETURN CASE WHEN delta=0 THEN 'unchanged' ELSE 'adjusted' END;
END $$;
--> statement-breakpoint

CREATE FUNCTION commerce_available(p_shop text, p_currency text)
RETURNS TABLE(ambassador_id text, amount_minor bigint) LANGUAGE sql AS $$
  WITH earned AS (
    SELECT o.ambassador_id,
      sum(CASE WHEN o.hold_reason IS NULL AND o.release_at<=now() THEN o.target_minor ELSE 0 END) AS cleared
    FROM commerce_orders o WHERE o.shop=p_shop AND o.currency=p_currency AND o.ambassador_id IS NOT NULL GROUP BY o.ambassador_id
  ), committed AS (
    SELECT i.ambassador_id,sum(i.amount_minor) AS amount FROM commerce_payout_items i
    JOIN commerce_payout_batches b ON b.shop=i.shop AND b.id=i.batch_id
    WHERE b.shop=p_shop AND b.currency=p_currency AND b.state IN ('approved','paid') GROUP BY i.ambassador_id
  )
  SELECT e.ambassador_id,(e.cleared-coalesce(c.amount,0))::bigint FROM earned e
  LEFT JOIN committed c ON c.ambassador_id=e.ambassador_id
  JOIN commerce_ambassadors a ON a.shop=p_shop AND a.id=e.ambassador_id
  JOIN members m ON m.user_id=a.member_id WHERE a.status='active' AND m.status='active'
$$;
--> statement-breakpoint
CREATE FUNCTION commerce_payout(p_shop text, p_id text, p_currency text, p_action text, p_actor text, p_reference text DEFAULT NULL)
RETURNS text LANGUAGE plpgsql AS $$
DECLARE b commerce_payout_batches%ROWTYPE;
BEGIN
  PERFORM 1 FROM commerce_shops WHERE shop=p_shop AND status='active' FOR UPDATE;
  IF NOT FOUND THEN RAISE EXCEPTION 'Shop inactive'; END IF;
  SELECT * INTO b FROM commerce_payout_batches WHERE shop=p_shop AND id=p_id;
  IF p_action='approve' THEN
    IF FOUND THEN RETURN b.state; END IF;
    IF NOT EXISTS(SELECT 1 FROM commerce_shops WHERE shop=p_shop AND reconciled_at > now()-interval '1 hour')
      OR EXISTS(SELECT 1 FROM commerce_orders o JOIN commerce_shops s ON s.shop=o.shop WHERE o.shop=p_shop AND o.ambassador_id IS NOT NULL AND (s.reconcile_started_at IS NULL OR o.fetched_at<s.reconcile_started_at))
      OR EXISTS(SELECT 1 FROM commerce_receipts WHERE shop=p_shop AND state<>'done')
      OR EXISTS(SELECT 1 FROM commerce_orders WHERE shop=p_shop AND hold_reason IS NOT NULL AND ambassador_id IS NOT NULL AND target_minor>0)
      THEN RAISE EXCEPTION 'Reconcile all activity and resolve review holds before payout'; END IF;
    INSERT INTO commerce_payout_batches(shop,id,currency,created_by) VALUES(p_shop,p_id,p_currency,p_actor);
    INSERT INTO commerce_payout_items(shop,batch_id,ambassador_id,amount_minor)
      SELECT p_shop,p_id,ambassador_id,amount_minor FROM commerce_available(p_shop,p_currency) WHERE amount_minor>0;
    IF NOT FOUND THEN RAISE EXCEPTION 'No cleared positive balance'; END IF;
  ELSIF p_action='paid' THEN
    IF b.state='paid' AND b.payment_reference=p_reference THEN RETURN 'paid'; END IF;
    IF b.state IS DISTINCT FROM 'approved' OR p_reference IS NULL OR length(trim(p_reference))<3 THEN RAISE EXCEPTION 'Approved batch and external payment reference required'; END IF;
    IF EXISTS(SELECT 1 FROM commerce_orders o JOIN commerce_shops s ON s.shop=o.shop WHERE o.shop=p_shop AND o.ambassador_id IS NOT NULL AND (s.reconcile_started_at IS NULL OR o.fetched_at<s.reconcile_started_at))
      OR EXISTS(SELECT 1 FROM commerce_receipts WHERE shop=p_shop AND state<>'done')
      OR NOT EXISTS(SELECT 1 FROM commerce_shops WHERE shop=p_shop AND reconciled_at > now()-interval '1 hour')
      OR EXISTS(SELECT 1 FROM commerce_orders WHERE shop=p_shop AND hold_reason IS NOT NULL AND ambassador_id IS NOT NULL AND target_minor>0)
      OR EXISTS(SELECT 1 FROM commerce_available(p_shop,b.currency) WHERE amount_minor<0)
      OR EXISTS(SELECT 1 FROM commerce_payout_items i JOIN commerce_ambassadors a ON a.shop=i.shop AND a.id=i.ambassador_id JOIN members m ON m.user_id=a.member_id WHERE i.shop=p_shop AND i.batch_id=p_id AND (a.status<>'active' OR m.status<>'active'))
      THEN RAISE EXCEPTION 'Batch needs reconciliation; void and recreate if balances changed'; END IF;
    UPDATE commerce_payout_batches SET state='paid',paid_at=now(),payment_reference=p_reference WHERE shop=p_shop AND id=p_id;
  ELSIF p_action='void' THEN
    IF b.state='void' THEN RETURN 'void'; END IF;
    IF b.state IS DISTINCT FROM 'approved' THEN RAISE EXCEPTION 'Only unpaid approved batches can be voided'; END IF;
    UPDATE commerce_payout_batches SET state='void' WHERE shop=p_shop AND id=p_id;
  ELSE RAISE EXCEPTION 'Unknown payout action'; END IF;
  INSERT INTO commerce_audit(shop,actor,action,subject,detail) VALUES(p_shop,p_actor,'payout_'||p_action,p_id,jsonb_build_object('reference',p_reference));
  RETURN p_action;
END $$;
--> statement-breakpoint

CREATE FUNCTION commerce_enqueue(p_shop text,p_delivery text,p_topic text,p_resource text,p_payload jsonb,p_event text DEFAULT NULL)
RETURNS void LANGUAGE plpgsql AS $$
BEGIN
  PERFORM 1 FROM commerce_shops WHERE shop=p_shop FOR UPDATE;
  IF NOT FOUND THEN RAISE EXCEPTION 'Unknown shop'; END IF;
  INSERT INTO commerce_receipts(shop,delivery_id,topic,resource_id,payload,event_id)
    VALUES(p_shop,p_delivery,p_topic,p_resource,p_payload,p_event) ON CONFLICT(shop,delivery_id,topic) DO NOTHING;
  IF p_topic='app/uninstalled' THEN UPDATE commerce_shops SET status='uninstalled',reconciled_at=NULL WHERE shop=p_shop; END IF;
END $$;
