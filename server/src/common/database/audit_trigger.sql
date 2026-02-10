-- Creates audit_log table + trigger for server-side safety

CREATE TABLE IF NOT EXISTS "AuditLog" (
  "id" TEXT PRIMARY KEY,
  "hotelId" TEXT,
  "userId" TEXT,
  "action" TEXT NOT NULL,
  "entity" TEXT NOT NULL,
  "entityId" TEXT,
  "payload" JSONB,
  "createdAt" TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE OR REPLACE FUNCTION public.write_audit_log() RETURNS trigger
LANGUAGE plpgsql
AS $$
DECLARE
  v_user_id TEXT;
  v_hotel_id TEXT;
  v_entity_id TEXT;
  v_payload JSONB;
BEGIN
  v_user_id := current_setting('app.user_id', true);
  v_hotel_id := current_setting('app.hotel_id', true);

  IF TG_OP = 'INSERT' THEN
    v_entity_id := NEW.id;
    v_payload := to_jsonb(NEW);
  ELSIF TG_OP = 'UPDATE' THEN
    v_entity_id := NEW.id;
    v_payload := jsonb_build_object('old', to_jsonb(OLD), 'new', to_jsonb(NEW));
  ELSIF TG_OP = 'DELETE' THEN
    v_entity_id := OLD.id;
    v_payload := to_jsonb(OLD);
  END IF;

  INSERT INTO "AuditLog" ("hotelId", "userId", "action", "entity", "entityId", "payload")
  VALUES (v_hotel_id, v_user_id, TG_OP, TG_TABLE_NAME, v_entity_id, v_payload);

  RETURN NULL;
END;
$$;

-- Example: attach to stays/payments/expenses/rooms.
-- You can run these in psql if needed.
-- CREATE TRIGGER audit_stays
-- AFTER INSERT OR UPDATE OR DELETE ON public.stays
-- FOR EACH ROW EXECUTE FUNCTION public.write_audit_log();
