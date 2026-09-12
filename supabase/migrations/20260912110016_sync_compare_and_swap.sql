-- Monotonic server revisions: clients must use the CAS RPC for updates.
CREATE OR REPLACE FUNCTION public.guard_sync_revision() RETURNS trigger
LANGUAGE plpgsql SECURITY INVOKER SET search_path = pg_catalog AS $$
BEGIN
  IF current_user = 'authenticated' AND current_setting('echotype.sync_write',true) IS DISTINCT FROM '1' THEN
    RAISE EXCEPTION 'Upgrade EchoType to use revision-checked synchronization' USING ERRCODE='40001';
  END IF;
  IF TG_OP='DELETE' THEN RETURN OLD; END IF;
  NEW.sync_revision := OLD.sync_revision + 1;
  NEW.updated_at := clock_timestamp();
  RETURN NEW;
END $$;

DO $$ DECLARE entity text; key_name text; key_definition text; BEGIN
  FOREACH entity IN ARRAY ARRAY['contents','records','sessions','favorites','favoriteFolders','journals','books','collections','weakSpots','pronunciationProgress','learningAttempts','dailyTasks'] LOOP
    IF to_regclass(format('public.%I',entity)) IS NOT NULL THEN
      SELECT conname,pg_get_constraintdef(oid) INTO key_name,key_definition FROM pg_constraint
        WHERE conrelid=to_regclass(format('public.%I',entity)) AND contype='p';
      IF key_definition='PRIMARY KEY (id)' THEN
        -- Preserve all rows. External FK dependencies intentionally stop this migration; never CASCADE.
        EXECUTE format('ALTER TABLE public.%I DROP CONSTRAINT %I, ADD PRIMARY KEY(user_id,id)',entity,key_name);
      ELSIF key_definition NOT IN ('PRIMARY KEY (user_id, id)','PRIMARY KEY (id, user_id)') OR key_definition IS NULL THEN
        RAISE EXCEPTION 'Unexpected primary key on %. Review account identity migration manually.',entity;
      END IF;
      EXECUTE format('ALTER TABLE public.%I ADD COLUMN IF NOT EXISTS sync_revision bigint NOT NULL DEFAULT 1',entity);
      EXECUTE format('ALTER TABLE public.%I ADD COLUMN IF NOT EXISTS sync_deleted_at timestamptz',entity);
      EXECUTE format('GRANT SELECT, INSERT, UPDATE, DELETE ON public.%I TO authenticated',entity);
      EXECUTE format('CREATE TRIGGER guard_sync_revision BEFORE UPDATE OR DELETE ON public.%I FOR EACH ROW EXECUTE FUNCTION public.guard_sync_revision()',entity);
    END IF;
  END LOOP;
END $$;

CREATE OR REPLACE FUNCTION public.sync_compare_and_swap(entity_table text, entity jsonb, expected_revision bigint)
RETURNS jsonb LANGUAGE plpgsql SECURITY INVOKER SET search_path = pg_catalog, public AS $$
DECLARE
  owner_id uuid := auth.uid();
  entity_id text := entity->>'id';
  previous jsonb;
  result jsonb;
  payload jsonb;
  column_names text;
  selected_columns text;
  assignments text;
  comparison jsonb;
  deleting boolean := coalesce(entity->>'_sync_delete'='true',false);
BEGIN
  IF owner_id IS NULL THEN RAISE EXCEPTION 'Authentication required' USING ERRCODE='42501'; END IF;
  IF entity_table NOT IN ('contents','records','sessions','favorites','favoriteFolders','journals','books','collections','weakSpots','pronunciationProgress','learningAttempts','dailyTasks') THEN
    RAISE EXCEPTION 'Unsupported sync entity';
  END IF;
  IF entity_id IS NULL OR length(entity_id)=0 THEN RAISE EXCEPTION 'Missing entity id'; END IF;
  -- Covers create/create races as well as updates. RLS still governs every statement.
  PERFORM pg_advisory_xact_lock(hashtextextended(entity_table || ':' || owner_id::text || ':' || entity_id,0));
  EXECUTE format('SELECT to_jsonb(t) FROM public.%I t WHERE id=$1 AND user_id=$2 FOR UPDATE',entity_table) INTO previous USING entity_id,owner_id;
  IF deleting AND (previous IS NULL OR previous->>'sync_deleted_at' IS NOT NULL) THEN
    RETURN jsonb_build_object('status','applied','row',previous);
  END IF;
  -- Retry after a lost acknowledgement is idempotent when the submitted payload already exists.
  EXECUTE format('SELECT jsonb_object_agg(key,value) FROM jsonb_each(to_jsonb(jsonb_populate_record(NULL::public.%I,$1))) WHERE $1 ? key AND key NOT IN (''sync_revision'',''updated_at'',''user_id'')',entity_table)
    INTO comparison USING entity;
  IF NOT deleting AND previous IS NOT NULL AND previous->>'sync_deleted_at' IS NULL AND previous @> comparison THEN
    RETURN jsonb_build_object('status','applied','row',previous);
  END IF;
  IF (previous IS NOT NULL AND (expected_revision IS NULL OR (previous->>'sync_revision')::bigint != expected_revision))
     OR (previous IS NULL AND expected_revision IS NOT NULL) THEN
    RETURN jsonb_build_object('status','conflict','row',previous);
  END IF;
  payload := CASE WHEN deleting THEN jsonb_build_object('id',entity_id,'sync_deleted_at',clock_timestamp())
    ELSE (entity - 'sync_revision' - '_sync_delete') || jsonb_build_object('sync_deleted_at',NULL) END
    || jsonb_build_object('user_id',owner_id,'updated_at',clock_timestamp());
  SELECT string_agg(format('%I',key),','), string_agg(format('p.%I',key),','),
    string_agg(format('%I=p.%I',key,key),',') FILTER (WHERE key NOT IN ('id','user_id','created_at'))
  INTO column_names,selected_columns,assignments
  FROM jsonb_object_keys(payload) key
  JOIN pg_attribute a ON a.attname=key AND a.attrelid=to_regclass(format('public.%I',entity_table)) AND a.attnum>0 AND NOT a.attisdropped;
  PERFORM set_config('echotype.sync_write','1',true);
  IF previous IS NULL THEN
    EXECUTE format('INSERT INTO public.%I AS t (%s) SELECT %s FROM jsonb_populate_record(NULL::public.%I,$1) p RETURNING to_jsonb(t)',entity_table,column_names,selected_columns,entity_table)
      INTO result USING payload;
  ELSE
    EXECUTE format('UPDATE public.%I t SET %s FROM jsonb_populate_record(NULL::public.%I,$1) p WHERE t.id=$2 AND t.user_id=$3 RETURNING to_jsonb(t)',entity_table,assignments,entity_table)
      INTO result USING payload,entity_id,owner_id;
  END IF;
  -- Preserve the existing journal-delete cascade, atomically with the accepted parent revision.
  IF entity_table='journals' AND payload->>'deleted_at' IS NOT NULL THEN
    DELETE FROM public.contents WHERE user_id=owner_id AND category='journal:' || entity_id;
    IF to_regclass('public.favorites') IS NOT NULL THEN
      EXECUTE 'DELETE FROM public.favorites WHERE user_id=$1 AND source_module=$2 AND source_content_id=$3' USING owner_id,'journal',entity_id;
    END IF;
  END IF;
  PERFORM set_config('echotype.sync_write','',true);
  RETURN jsonb_build_object('status','applied','row',result);
END $$;
REVOKE ALL ON FUNCTION public.sync_compare_and_swap(text,jsonb,bigint) FROM PUBLIC,anon;
GRANT EXECUTE ON FUNCTION public.sync_compare_and_swap(text,jsonb,bigint) TO authenticated;

CREATE OR REPLACE FUNCTION public.sync_server_clock() RETURNS timestamptz
LANGUAGE sql SECURITY INVOKER SET search_path = pg_catalog AS $$ SELECT clock_timestamp() $$;
REVOKE ALL ON FUNCTION public.sync_server_clock() FROM PUBLIC,anon;
GRANT EXECUTE ON FUNCTION public.sync_server_clock() TO authenticated;
