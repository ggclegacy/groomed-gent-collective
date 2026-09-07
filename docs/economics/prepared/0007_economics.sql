-- CANDIDATE ONLY. After all current account migrations and prepared commerce candidate.
-- One optimistic, serialized stream per shop for this foundation. Never mix old/new payouts.
CREATE TABLE collective_economic_streams (
 shop text PRIMARY KEY REFERENCES commerce_shops(shop), revision bigint NOT NULL DEFAULT 0,
 document jsonb NOT NULL DEFAULT '{"controls":{},"payments":{},"orders":{},"books":{},"awards":{},"objectives":{}}',
 CHECK(revision>=0)
);
CREATE TABLE collective_economic_rules (
 shop text NOT NULL REFERENCES commerce_shops(shop), version text NOT NULL,
 digest text NOT NULL, document jsonb NOT NULL, actor text NOT NULL, created_at timestamptz NOT NULL DEFAULT now(),
 PRIMARY KEY(shop,version), CHECK(document->>'version'=version)
);
CREATE TABLE collective_economic_events (
 shop text NOT NULL REFERENCES commerce_shops(shop), id text NOT NULL, digest text NOT NULL,
 revision bigint NOT NULL, actor text NOT NULL, reason text NOT NULL CHECK(length(trim(reason))>0),
 kind text NOT NULL, document jsonb NOT NULL, created_at timestamptz NOT NULL DEFAULT now(),
 PRIMARY KEY(shop,id), UNIQUE(shop,revision)
);
CREATE TABLE collective_economic_ledger (
 id bigserial PRIMARY KEY, shop text NOT NULL, event_id text NOT NULL,
 award_key text NOT NULL, ambassador_id text NOT NULL, currency text NOT NULL CHECK(currency ~ '^[A-Z]{3}$'),
 lane text NOT NULL, kind text NOT NULL, delta_minor bigint NOT NULL, delta_xp bigint NOT NULL,
 release_at timestamptz NOT NULL, hold_reason text, rule_snapshot jsonb NOT NULL,
 evidence jsonb NOT NULL, reason text NOT NULL, created_at timestamptz NOT NULL DEFAULT now(),
 FOREIGN KEY(shop,event_id) REFERENCES collective_economic_events(shop,id),
 FOREIGN KEY(shop,ambassador_id) REFERENCES commerce_ambassadors(shop,id),
 UNIQUE(shop,event_id,award_key)
);
CREATE INDEX collective_economic_ledger_member ON collective_economic_ledger(shop,ambassador_id,currency,id);
CREATE TRIGGER collective_economic_rules_immutable BEFORE UPDATE OR DELETE ON collective_economic_rules FOR EACH ROW EXECUTE FUNCTION commerce_immutable();
CREATE TRIGGER collective_economic_events_immutable BEFORE UPDATE OR DELETE ON collective_economic_events FOR EACH ROW EXECUTE FUNCTION commerce_immutable();
CREATE TRIGGER collective_economic_ledger_immutable BEFORE UPDATE OR DELETE ON collective_economic_ledger FOR EACH ROW EXECUTE FUNCTION commerce_immutable();

-- Atomic compare-and-swap: receipt, projection, rules and ledger commit or rollback together.
-- Invoker security; never grant this function or direct writes to browser/database public roles.
CREATE FUNCTION collective_economic_commit(p_shop text,p_expected bigint,p_id text,p_digest text,p_actor text,p_reason text,p_kind text,p_event jsonb,p_rules jsonb,p_rule_digest text,p_state jsonb,p_entries jsonb)
RETURNS text LANGUAGE plpgsql AS $$
DECLARE current_revision bigint; existing_digest text; e jsonb;
BEGIN
 PERFORM 1 FROM commerce_shops WHERE shop=p_shop AND status='active' FOR UPDATE;
 IF NOT FOUND THEN RAISE EXCEPTION 'Shop inactive'; END IF;
 IF p_kind='order' AND EXISTS(SELECT 1 FROM commerce_ledger WHERE shop=p_shop AND order_id=p_event->'order'->>'id') THEN RAISE EXCEPTION 'Legacy economic history requires explicit cutover'; END IF;
 SELECT digest INTO existing_digest FROM collective_economic_events WHERE shop=p_shop AND id=p_id;
 IF FOUND THEN
   IF existing_digest<>p_digest THEN RAISE EXCEPTION 'Idempotency conflict'; END IF;
   RETURN 'duplicate';
 END IF;
 INSERT INTO collective_economic_streams(shop) VALUES(p_shop) ON CONFLICT DO NOTHING;
 SELECT revision INTO current_revision FROM collective_economic_streams WHERE shop=p_shop FOR UPDATE;
 IF current_revision<>p_expected THEN RETURN 'retry'; END IF;
 IF EXISTS(SELECT 1 FROM collective_economic_rules WHERE shop=p_shop AND version=p_rules->>'version' AND digest<>p_rule_digest) THEN RAISE EXCEPTION 'Rule version cannot change'; END IF;
 INSERT INTO collective_economic_rules(shop,version,digest,document,actor) VALUES(p_shop,p_rules->>'version',p_rule_digest,p_rules,p_actor) ON CONFLICT DO NOTHING;
 INSERT INTO collective_economic_events(shop,id,digest,revision,actor,reason,kind,document)
 VALUES(p_shop,p_id,p_digest,current_revision+1,p_actor,p_reason,p_kind,p_event);
 FOR e IN SELECT value FROM jsonb_array_elements(p_entries) LOOP
   INSERT INTO collective_economic_ledger(shop,event_id,award_key,ambassador_id,currency,lane,kind,delta_minor,delta_xp,release_at,hold_reason,rule_snapshot,evidence,reason)
   VALUES(p_shop,p_id,e->>'key',e->>'ambassador',e->'rules'->>'currency',e->>'lane',e->>'kind',(e->>'deltaMinor')::bigint,(e->>'deltaXp')::bigint,(e->>'releaseAt')::timestamptz,e->>'hold',e->'rules',e->'evidence',e->>'reason');
 END LOOP;
 UPDATE collective_economic_streams SET revision=current_revision+1,document=p_state WHERE shop=p_shop;
 RETURN 'applied';
END $$;
REVOKE ALL ON FUNCTION collective_economic_commit(text,bigint,text,text,text,text,text,jsonb,jsonb,text,jsonb,jsonb) FROM PUBLIC;

-- Both writers lock commerce_shops first. Reject cross-engine accounting in either direction.
CREATE INDEX collective_economic_order_events ON collective_economic_events(shop, (document->'order'->>'id')) WHERE kind='order';
CREATE FUNCTION collective_reject_legacy_overlap() RETURNS trigger LANGUAGE plpgsql AS $$
BEGIN
 IF EXISTS(SELECT 1 FROM collective_economic_events WHERE shop=NEW.shop AND kind='order' AND document->'order'->>'id'=NEW.order_id) THEN
   RAISE EXCEPTION 'Order already belongs to Collective economics';
 END IF;
 RETURN NEW;
END $$;
CREATE TRIGGER collective_legacy_overlap BEFORE INSERT ON commerce_ledger FOR EACH ROW EXECUTE FUNCTION collective_reject_legacy_overlap();
