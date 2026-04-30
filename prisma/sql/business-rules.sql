DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1
    FROM pg_constraint c
    JOIN pg_namespace n ON n.oid = c.connamespace
    WHERE c.conname = 'chk_products_purchase_price_non_negative'
      AND n.nspname = current_schema()
  ) THEN
    EXECUTE 'ALTER TABLE products ADD CONSTRAINT chk_products_purchase_price_non_negative CHECK (purchase_price >= 0)';
  END IF;

  IF NOT EXISTS (
    SELECT 1
    FROM pg_constraint c
    JOIN pg_namespace n ON n.oid = c.connamespace
    WHERE c.conname = 'chk_products_sale_price_non_negative'
      AND n.nspname = current_schema()
  ) THEN
    EXECUTE 'ALTER TABLE products ADD CONSTRAINT chk_products_sale_price_non_negative CHECK (sale_price IS NULL OR sale_price >= 0)';
  END IF;

  IF NOT EXISTS (
    SELECT 1
    FROM pg_constraint c
    JOIN pg_namespace n ON n.oid = c.connamespace
    WHERE c.conname = 'chk_products_minimum_stock_non_negative'
      AND n.nspname = current_schema()
  ) THEN
    EXECUTE 'ALTER TABLE products ADD CONSTRAINT chk_products_minimum_stock_non_negative CHECK (minimum_stock >= 0)';
  END IF;

  IF NOT EXISTS (
    SELECT 1
    FROM pg_constraint c
    JOIN pg_namespace n ON n.oid = c.connamespace
    WHERE c.conname = 'chk_products_current_stock_non_negative'
      AND n.nspname = current_schema()
  ) THEN
    EXECUTE 'ALTER TABLE products ADD CONSTRAINT chk_products_current_stock_non_negative CHECK (current_stock >= 0)';
  END IF;

  IF NOT EXISTS (
    SELECT 1
    FROM pg_constraint c
    JOIN pg_namespace n ON n.oid = c.connamespace
    WHERE c.conname = 'chk_users_avatar_size'
      AND n.nspname = current_schema()
  ) THEN
    EXECUTE 'ALTER TABLE users ADD CONSTRAINT chk_users_avatar_size CHECK (avatar_data IS NULL OR octet_length(avatar_data) <= 4194304)';
  END IF;

  IF NOT EXISTS (
    SELECT 1
    FROM pg_constraint c
    JOIN pg_namespace n ON n.oid = c.connamespace
    WHERE c.conname = 'chk_users_avatar_payload'
      AND n.nspname = current_schema()
  ) THEN
    EXECUTE 'ALTER TABLE users ADD CONSTRAINT chk_users_avatar_payload CHECK (
      (avatar_data IS NULL AND avatar_mime_type IS NULL)
      OR (
        avatar_data IS NOT NULL
        AND avatar_mime_type IN (''image/jpeg'', ''image/png'', ''image/webp'')
      )
    )';
  END IF;

  IF NOT EXISTS (
    SELECT 1
    FROM pg_constraint c
    JOIN pg_namespace n ON n.oid = c.connamespace
    WHERE c.conname = 'chk_stock_entries_status_received_at'
      AND n.nspname = current_schema()
  ) THEN
    EXECUTE 'ALTER TABLE stock_entries ADD CONSTRAINT chk_stock_entries_status_received_at CHECK (
      (status = ''ORDERED'' AND received_at IS NULL)
      OR (status = ''RECEIVED'' AND received_at IS NOT NULL AND received_at >= ordered_at)
    )';
  END IF;

  IF NOT EXISTS (
    SELECT 1
    FROM pg_constraint c
    JOIN pg_namespace n ON n.oid = c.connamespace
    WHERE c.conname = 'chk_stock_entry_items_quantity_positive'
      AND n.nspname = current_schema()
  ) THEN
    EXECUTE 'ALTER TABLE stock_entry_items ADD CONSTRAINT chk_stock_entry_items_quantity_positive CHECK (quantity > 0)';
  END IF;

  IF NOT EXISTS (
    SELECT 1
    FROM pg_constraint c
    JOIN pg_namespace n ON n.oid = c.connamespace
    WHERE c.conname = 'chk_stock_entry_items_unit_cost_non_negative'
      AND n.nspname = current_schema()
  ) THEN
    EXECUTE 'ALTER TABLE stock_entry_items ADD CONSTRAINT chk_stock_entry_items_unit_cost_non_negative CHECK (unit_cost >= 0)';
  END IF;

  IF NOT EXISTS (
    SELECT 1
    FROM pg_constraint c
    JOIN pg_namespace n ON n.oid = c.connamespace
    WHERE c.conname = 'chk_stock_output_items_quantity_positive'
      AND n.nspname = current_schema()
  ) THEN
    EXECUTE 'ALTER TABLE stock_output_items ADD CONSTRAINT chk_stock_output_items_quantity_positive CHECK (quantity > 0)';
  END IF;

  IF NOT EXISTS (
    SELECT 1
    FROM pg_constraint c
    JOIN pg_namespace n ON n.oid = c.connamespace
    WHERE c.conname = 'chk_stock_output_items_unit_cost_non_negative'
      AND n.nspname = current_schema()
  ) THEN
    EXECUTE 'ALTER TABLE stock_output_items ADD CONSTRAINT chk_stock_output_items_unit_cost_non_negative CHECK (unit_cost IS NULL OR unit_cost >= 0)';
  END IF;

  IF NOT EXISTS (
    SELECT 1
    FROM pg_constraint c
    JOIN pg_namespace n ON n.oid = c.connamespace
    WHERE c.conname = 'chk_stock_output_items_suggested_sale_price_non_negative'
      AND n.nspname = current_schema()
  ) THEN
    EXECUTE 'ALTER TABLE stock_output_items ADD CONSTRAINT chk_stock_output_items_suggested_sale_price_non_negative CHECK (suggested_unit_sale_price IS NULL OR suggested_unit_sale_price >= 0)';
  END IF;

  IF NOT EXISTS (
    SELECT 1
    FROM pg_constraint c
    JOIN pg_namespace n ON n.oid = c.connamespace
    WHERE c.conname = 'chk_stock_output_items_unit_sale_price_non_negative'
      AND n.nspname = current_schema()
  ) THEN
    EXECUTE 'ALTER TABLE stock_output_items ADD CONSTRAINT chk_stock_output_items_unit_sale_price_non_negative CHECK (unit_sale_price IS NULL OR unit_sale_price >= 0)';
  END IF;

  IF NOT EXISTS (
    SELECT 1
    FROM pg_constraint c
    JOIN pg_namespace n ON n.oid = c.connamespace
    WHERE c.conname = 'chk_service_type_supplies_quantity_positive'
      AND n.nspname = current_schema()
  ) THEN
    EXECUTE 'ALTER TABLE service_type_supplies ADD CONSTRAINT chk_service_type_supplies_quantity_positive CHECK (quantity_per_unit > 0)';
  END IF;

  IF NOT EXISTS (
    SELECT 1
    FROM pg_constraint c
    JOIN pg_namespace n ON n.oid = c.connamespace
    WHERE c.conname = 'chk_service_records_quantity_positive'
      AND n.nspname = current_schema()
  ) THEN
    EXECUTE 'ALTER TABLE service_records ADD CONSTRAINT chk_service_records_quantity_positive CHECK (quantity > 0)';
  END IF;

  IF NOT EXISTS (
    SELECT 1
    FROM pg_constraint c
    JOIN pg_namespace n ON n.oid = c.connamespace
    WHERE c.conname = 'chk_service_records_status_delivered_at'
      AND n.nspname = current_schema()
  ) THEN
    EXECUTE 'ALTER TABLE service_records ADD CONSTRAINT chk_service_records_status_delivered_at CHECK (
      (status = ''DELIVERED'' AND delivered_at IS NOT NULL AND delivered_at >= service_date)
      OR (status <> ''DELIVERED'' AND delivered_at IS NULL)
    )';
  END IF;

  IF NOT EXISTS (
    SELECT 1
    FROM pg_constraint c
    JOIN pg_namespace n ON n.oid = c.connamespace
    WHERE c.conname = 'chk_service_consumptions_quantity_positive'
      AND n.nspname = current_schema()
  ) THEN
    EXECUTE 'ALTER TABLE service_consumptions ADD CONSTRAINT chk_service_consumptions_quantity_positive CHECK (quantity > 0)';
  END IF;

  IF NOT EXISTS (
    SELECT 1
    FROM pg_constraint c
    JOIN pg_namespace n ON n.oid = c.connamespace
    WHERE c.conname = 'chk_stock_movements_quantity_positive'
      AND n.nspname = current_schema()
  ) THEN
    EXECUTE 'ALTER TABLE stock_movements ADD CONSTRAINT chk_stock_movements_quantity_positive CHECK (quantity > 0)';
  END IF;

  IF NOT EXISTS (
    SELECT 1
    FROM pg_constraint c
    JOIN pg_namespace n ON n.oid = c.connamespace
    WHERE c.conname = 'chk_stock_movements_unit_cost_non_negative'
      AND n.nspname = current_schema()
  ) THEN
    EXECUTE 'ALTER TABLE stock_movements ADD CONSTRAINT chk_stock_movements_unit_cost_non_negative CHECK (unit_cost IS NULL OR unit_cost >= 0)';
  END IF;
END
$$;

CREATE UNIQUE INDEX IF NOT EXISTS uq_product_suppliers_preferred_per_product
  ON product_suppliers (product_id)
  WHERE is_preferred;

CREATE OR REPLACE FUNCTION prevent_history_delete()
RETURNS trigger
LANGUAGE plpgsql
AS $$
BEGIN
  RAISE EXCEPTION '% rows are append-only and cannot be deleted', TG_TABLE_NAME;
END;
$$;

CREATE OR REPLACE FUNCTION prevent_stock_movement_mutation()
RETURNS trigger
LANGUAGE plpgsql
AS $$
BEGIN
  RAISE EXCEPTION 'stock_movements rows are immutable';
END;
$$;

CREATE OR REPLACE FUNCTION prepare_stock_entry()
RETURNS trigger
LANGUAGE plpgsql
AS $$
BEGIN
  IF NEW.status::text = 'RECEIVED' AND NEW.received_at IS NULL THEN
    NEW.received_at := now();
  END IF;

  IF TG_OP = 'UPDATE' THEN
    IF OLD.status::text = 'RECEIVED' AND NEW.status::text <> 'RECEIVED' THEN
      RAISE EXCEPTION 'Received stock entries cannot be reverted to another status';
    END IF;

    IF OLD.status::text = 'RECEIVED'
       AND (
         NEW.supplier_id IS DISTINCT FROM OLD.supplier_id
         OR NEW.ordered_at IS DISTINCT FROM OLD.ordered_at
         OR NEW.received_at IS DISTINCT FROM OLD.received_at
       ) THEN
      RAISE EXCEPTION 'Received stock entries are immutable except for notes and reference number';
    END IF;
  END IF;

  RETURN NEW;
END;
$$;

CREATE OR REPLACE FUNCTION guard_received_stock_entry_item_mutations()
RETURNS trigger
LANGUAGE plpgsql
AS $$
DECLARE
  v_status text;
BEGIN
  SELECT status::text
    INTO v_status
  FROM stock_entries
  WHERE id = CASE
    WHEN TG_OP = 'DELETE' THEN OLD.stock_entry_id
    ELSE NEW.stock_entry_id
  END;

  IF v_status = 'RECEIVED' THEN
    IF TG_OP = 'DELETE' THEN
      RAISE EXCEPTION 'Received stock entry items cannot be deleted';
    END IF;

    IF NEW.stock_entry_id IS DISTINCT FROM OLD.stock_entry_id
       OR NEW.product_id IS DISTINCT FROM OLD.product_id
       OR NEW.quantity IS DISTINCT FROM OLD.quantity
       OR NEW.unit_cost IS DISTINCT FROM OLD.unit_cost THEN
      RAISE EXCEPTION 'Received stock entry items are immutable';
    END IF;
  END IF;

  RETURN COALESCE(NEW, OLD);
END;
$$;

CREATE OR REPLACE FUNCTION apply_received_stock_entry_item(p_stock_entry_item_id uuid)
RETURNS void
LANGUAGE plpgsql
AS $$
DECLARE
  v_product_id uuid;
  v_user_id uuid;
  v_quantity numeric;
  v_unit_cost numeric;
  v_occurred_at timestamp;
  v_product_stock_after numeric;
BEGIN
  SELECT sei.product_id,
         se.created_by_id,
         sei.quantity,
         sei.unit_cost,
         COALESCE(se.received_at, se.created_at)
    INTO v_product_id,
         v_user_id,
         v_quantity,
         v_unit_cost,
         v_occurred_at
  FROM stock_entry_items sei
  JOIN stock_entries se
    ON se.id = sei.stock_entry_id
  WHERE sei.id = p_stock_entry_item_id
    AND se.status::text = 'RECEIVED';

  IF NOT FOUND THEN
    RETURN;
  END IF;

  IF EXISTS (
    SELECT 1
    FROM stock_movements
    WHERE stock_entry_item_id = p_stock_entry_item_id
  ) THEN
    RETURN;
  END IF;

  UPDATE products
  SET purchase_price = CASE
        WHEN current_stock + v_quantity > 0 THEN
          round(((current_stock * purchase_price) + (v_quantity * v_unit_cost)) / (current_stock + v_quantity), 2)
        ELSE v_unit_cost
      END,
      current_stock = current_stock + v_quantity,
      updated_at = now()
  WHERE id = v_product_id
  RETURNING current_stock
    INTO v_product_stock_after;

  INSERT INTO stock_movements (
    id,
    product_id,
    stock_entry_item_id,
    performed_by_id,
    movement_type,
    direction,
    quantity,
    unit_cost,
    product_stock_after,
    occurred_at,
    notes
  )
  VALUES (
    gen_random_uuid(),
    v_product_id,
    p_stock_entry_item_id,
    v_user_id,
    'PURCHASE_ENTRY'::"StockMovementType",
    'IN'::"StockMovementDirection",
    v_quantity,
    v_unit_cost,
    v_product_stock_after,
    v_occurred_at,
    'Auto-applied when stock entry reached RECEIVED status'
  );
END;
$$;

CREATE OR REPLACE FUNCTION after_insert_stock_entry_item()
RETURNS trigger
LANGUAGE plpgsql
AS $$
BEGIN
  PERFORM apply_received_stock_entry_item(NEW.id);
  RETURN NEW;
END;
$$;

CREATE OR REPLACE FUNCTION after_receive_stock_entry()
RETURNS trigger
LANGUAGE plpgsql
AS $$
DECLARE
  v_item record;
BEGIN
  IF NEW.status::text = 'RECEIVED' THEN
    IF TG_OP = 'INSERT' OR OLD.status::text <> 'RECEIVED' THEN
      FOR v_item IN
        SELECT id
        FROM stock_entry_items
        WHERE stock_entry_id = NEW.id
        ORDER BY created_at, id
      LOOP
        PERFORM apply_received_stock_entry_item(v_item.id);
      END LOOP;
    END IF;
  END IF;

  RETURN NEW;
END;
$$;

CREATE OR REPLACE FUNCTION consume_product_stock(
  p_product_id uuid,
  p_quantity numeric,
  p_movement_type text,
  p_stock_output_item_id uuid,
  p_service_consumption_id uuid,
  p_performed_by_id uuid,
  p_occurred_at timestamp,
  p_unit_cost numeric,
  p_notes text
)
RETURNS void
LANGUAGE plpgsql
AS $$
DECLARE
  v_product_stock_after numeric;
  v_unit_cost numeric;
BEGIN
  UPDATE products
  SET current_stock = current_stock - p_quantity,
      updated_at = now()
  WHERE id = p_product_id
    AND current_stock >= p_quantity
  RETURNING current_stock, COALESCE(p_unit_cost, purchase_price)
    INTO v_product_stock_after, v_unit_cost;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'Insufficient stock for product %', p_product_id;
  END IF;

  INSERT INTO stock_movements (
    id,
    product_id,
    stock_output_item_id,
    service_consumption_id,
    performed_by_id,
    movement_type,
    direction,
    quantity,
    unit_cost,
    product_stock_after,
    occurred_at,
    notes
  )
  VALUES (
    gen_random_uuid(),
    p_product_id,
    p_stock_output_item_id,
    p_service_consumption_id,
    p_performed_by_id,
    CASE p_movement_type
      WHEN 'SALE' THEN 'SALE'::"StockMovementType"
      WHEN 'WASTE' THEN 'WASTE'::"StockMovementType"
      WHEN 'INTERNAL_USE' THEN 'INTERNAL_USE'::"StockMovementType"
      ELSE 'SERVICE_CONSUMPTION'::"StockMovementType"
    END,
    'OUT'::"StockMovementDirection",
    p_quantity,
    v_unit_cost,
    v_product_stock_after,
    COALESCE(p_occurred_at, now()),
    p_notes
  );
END;
$$;

CREATE OR REPLACE FUNCTION prepare_stock_output_item()
RETURNS trigger
LANGUAGE plpgsql
AS $$
DECLARE
  v_purchase_price numeric;
  v_sale_price numeric;
  v_reason text;
BEGIN
  SELECT p.purchase_price,
         p.sale_price,
         so.reason::text
    INTO v_purchase_price,
         v_sale_price,
         v_reason
  FROM products p
  JOIN stock_outputs so
    ON so.id = NEW.stock_output_id
  WHERE p.id = NEW.product_id;

  IF NEW.unit_cost IS NULL THEN
    NEW.unit_cost := v_purchase_price;
  END IF;

  IF v_reason = 'SALE' THEN
    IF NEW.suggested_unit_sale_price IS NULL THEN
      NEW.suggested_unit_sale_price := v_sale_price;
    END IF;

    IF NEW.unit_sale_price IS NULL THEN
      NEW.unit_sale_price := NEW.suggested_unit_sale_price;
    END IF;
  ELSE
    NEW.suggested_unit_sale_price := NULL;
    NEW.unit_sale_price := NULL;
  END IF;

  RETURN NEW;
END;
$$;

CREATE OR REPLACE FUNCTION prevent_stock_output_item_mutation()
RETURNS trigger
LANGUAGE plpgsql
AS $$
BEGIN
  RAISE EXCEPTION 'stock_output_items are immutable once created';
END;
$$;

CREATE OR REPLACE FUNCTION after_insert_stock_output_item()
RETURNS trigger
LANGUAGE plpgsql
AS $$
DECLARE
  v_reason text;
  v_user_id uuid;
  v_occurred_at timestamp;
BEGIN
  SELECT reason::text, created_by_id, occurred_at
    INTO v_reason, v_user_id, v_occurred_at
  FROM stock_outputs
  WHERE id = NEW.stock_output_id;

  PERFORM consume_product_stock(
    NEW.product_id,
    NEW.quantity,
    v_reason,
    NEW.id,
    NULL,
    v_user_id,
    v_occurred_at,
    NEW.unit_cost,
    'Auto-applied from stock output item'
  );

  RETURN NEW;
END;
$$;

CREATE OR REPLACE FUNCTION guard_service_type_kind_mutation()
RETURNS trigger
LANGUAGE plpgsql
AS $$
BEGIN
  IF NEW.kind IS DISTINCT FROM OLD.kind
     AND EXISTS (
       SELECT 1
       FROM service_records
       WHERE service_type_id = OLD.id
     ) THEN
    RAISE EXCEPTION 'ServiceType.kind cannot change after service records exist';
  END IF;

  RETURN NEW;
END;
$$;

CREATE OR REPLACE FUNCTION validate_service_record_kind()
RETURNS trigger
LANGUAGE plpgsql
AS $$
DECLARE
  v_expected_kind text;
BEGIN
  SELECT kind::text
    INTO v_expected_kind
  FROM service_types
  WHERE id = NEW.service_type_id;

  IF v_expected_kind IS NULL THEN
    RAISE EXCEPTION 'service_type_id % does not exist', NEW.service_type_id;
  END IF;

  IF NEW.kind::text <> v_expected_kind THEN
    RAISE EXCEPTION 'ServiceRecord.kind must match ServiceType.kind';
  END IF;

  RETURN NEW;
END;
$$;

CREATE OR REPLACE FUNCTION guard_service_record_mutations()
RETURNS trigger
LANGUAGE plpgsql
AS $$
BEGIN
  IF TG_OP = 'DELETE' THEN
    RAISE EXCEPTION 'service_records rows are append-only and cannot be deleted';
  END IF;

  IF EXISTS (
    SELECT 1
    FROM service_consumptions
    WHERE service_record_id = OLD.id
  ) THEN
    IF NEW.service_type_id IS DISTINCT FROM OLD.service_type_id
       OR NEW.kind IS DISTINCT FROM OLD.kind
       OR NEW.quantity IS DISTINCT FROM OLD.quantity
       OR NEW.service_date IS DISTINCT FROM OLD.service_date THEN
      RAISE EXCEPTION 'Service records with applied consumptions cannot change quantity, kind, type, or service date';
    END IF;
  END IF;

  RETURN NEW;
END;
$$;

CREATE OR REPLACE FUNCTION after_insert_service_record()
RETURNS trigger
LANGUAGE plpgsql
AS $$
BEGIN
  IF NEW.kind::text = 'IN_HOUSE' AND NEW.status::text <> 'CANCELLED' THEN
    INSERT INTO service_consumptions (
      id,
      service_record_id,
      product_id,
      quantity,
      created_at
    )
    SELECT gen_random_uuid(),
           NEW.id,
           sts.product_id,
           sts.quantity_per_unit * NEW.quantity,
           NEW.created_at
    FROM service_type_supplies sts
    WHERE sts.service_type_id = NEW.service_type_id;
  END IF;

  RETURN NEW;
END;
$$;

CREATE OR REPLACE FUNCTION prevent_service_consumption_mutation()
RETURNS trigger
LANGUAGE plpgsql
AS $$
BEGIN
  RAISE EXCEPTION 'service_consumptions are immutable once created';
END;
$$;

CREATE OR REPLACE FUNCTION after_insert_service_consumption()
RETURNS trigger
LANGUAGE plpgsql
AS $$
DECLARE
  v_user_id uuid;
  v_service_date timestamp;
BEGIN
  SELECT created_by_id, service_date
    INTO v_user_id, v_service_date
  FROM service_records
  WHERE id = NEW.service_record_id;

  PERFORM consume_product_stock(
    NEW.product_id,
    NEW.quantity,
    'SERVICE_CONSUMPTION',
    NULL,
    NEW.id,
    v_user_id,
    v_service_date,
    NULL,
    'Auto-applied from service consumption'
  );

  RETURN NEW;
END;
$$;

DROP FUNCTION IF EXISTS consume_product_stock(uuid, numeric, text, uuid, uuid, uuid, timestamp, text);

DROP TRIGGER IF EXISTS trg_stock_entries_prepare ON stock_entries;
CREATE TRIGGER trg_stock_entries_prepare
BEFORE INSERT OR UPDATE ON stock_entries
FOR EACH ROW
EXECUTE FUNCTION prepare_stock_entry();

DROP TRIGGER IF EXISTS trg_stock_entries_apply_after_receive ON stock_entries;
CREATE TRIGGER trg_stock_entries_apply_after_receive
AFTER INSERT OR UPDATE ON stock_entries
FOR EACH ROW
EXECUTE FUNCTION after_receive_stock_entry();

DROP TRIGGER IF EXISTS trg_stock_entries_prevent_delete ON stock_entries;
CREATE TRIGGER trg_stock_entries_prevent_delete
BEFORE DELETE ON stock_entries
FOR EACH ROW
EXECUTE FUNCTION prevent_history_delete();

DROP TRIGGER IF EXISTS trg_stock_entry_items_validate_snacks ON stock_entry_items;
DROP FUNCTION IF EXISTS validate_snack_stock_entry_item();

DROP TRIGGER IF EXISTS trg_stock_entry_items_guard_received_mutations ON stock_entry_items;
CREATE TRIGGER trg_stock_entry_items_guard_received_mutations
BEFORE UPDATE OR DELETE ON stock_entry_items
FOR EACH ROW
EXECUTE FUNCTION guard_received_stock_entry_item_mutations();

DROP TRIGGER IF EXISTS trg_stock_entry_items_apply_after_insert ON stock_entry_items;
CREATE TRIGGER trg_stock_entry_items_apply_after_insert
AFTER INSERT ON stock_entry_items
FOR EACH ROW
EXECUTE FUNCTION after_insert_stock_entry_item();

DROP TRIGGER IF EXISTS trg_stock_outputs_prevent_delete ON stock_outputs;
CREATE TRIGGER trg_stock_outputs_prevent_delete
BEFORE DELETE ON stock_outputs
FOR EACH ROW
EXECUTE FUNCTION prevent_history_delete();

DROP TRIGGER IF EXISTS trg_stock_output_items_prevent_mutation ON stock_output_items;
CREATE TRIGGER trg_stock_output_items_prevent_mutation
BEFORE UPDATE OR DELETE ON stock_output_items
FOR EACH ROW
EXECUTE FUNCTION prevent_stock_output_item_mutation();

DROP TRIGGER IF EXISTS trg_stock_output_items_prepare ON stock_output_items;
CREATE TRIGGER trg_stock_output_items_prepare
BEFORE INSERT ON stock_output_items
FOR EACH ROW
EXECUTE FUNCTION prepare_stock_output_item();

DROP TRIGGER IF EXISTS trg_stock_output_items_apply_after_insert ON stock_output_items;
CREATE TRIGGER trg_stock_output_items_apply_after_insert
AFTER INSERT ON stock_output_items
FOR EACH ROW
EXECUTE FUNCTION after_insert_stock_output_item();

DROP TRIGGER IF EXISTS trg_service_types_guard_kind ON service_types;
CREATE TRIGGER trg_service_types_guard_kind
BEFORE UPDATE ON service_types
FOR EACH ROW
EXECUTE FUNCTION guard_service_type_kind_mutation();

DROP TRIGGER IF EXISTS trg_service_records_validate_kind ON service_records;
CREATE TRIGGER trg_service_records_validate_kind
BEFORE INSERT OR UPDATE ON service_records
FOR EACH ROW
EXECUTE FUNCTION validate_service_record_kind();

DROP TRIGGER IF EXISTS trg_service_records_guard_mutations ON service_records;
CREATE TRIGGER trg_service_records_guard_mutations
BEFORE UPDATE OR DELETE ON service_records
FOR EACH ROW
EXECUTE FUNCTION guard_service_record_mutations();

DROP TRIGGER IF EXISTS trg_service_records_apply_after_insert ON service_records;
CREATE TRIGGER trg_service_records_apply_after_insert
AFTER INSERT ON service_records
FOR EACH ROW
EXECUTE FUNCTION after_insert_service_record();

DROP TRIGGER IF EXISTS trg_service_consumptions_prevent_mutation ON service_consumptions;
CREATE TRIGGER trg_service_consumptions_prevent_mutation
BEFORE UPDATE OR DELETE ON service_consumptions
FOR EACH ROW
EXECUTE FUNCTION prevent_service_consumption_mutation();

DROP TRIGGER IF EXISTS trg_service_consumptions_apply_after_insert ON service_consumptions;
CREATE TRIGGER trg_service_consumptions_apply_after_insert
AFTER INSERT ON service_consumptions
FOR EACH ROW
EXECUTE FUNCTION after_insert_service_consumption();

DROP TRIGGER IF EXISTS trg_stock_movements_prevent_mutation ON stock_movements;
CREATE TRIGGER trg_stock_movements_prevent_mutation
BEFORE UPDATE OR DELETE ON stock_movements
FOR EACH ROW
EXECUTE FUNCTION prevent_stock_movement_mutation();
