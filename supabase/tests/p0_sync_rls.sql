-- Run against a disposable staging database after migrations. All test rows roll back.
BEGIN;
INSERT INTO auth.users (id,raw_user_meta_data) VALUES
  ('e0000000-0000-0000-0000-000000000001','{}'),
  ('e0000000-0000-0000-0000-000000000002','{}');
SET LOCAL ROLE authenticated;
SET LOCAL request.jwt.claim.sub = 'e0000000-0000-0000-0000-000000000001';
SELECT public.sync_compare_and_swap('favoriteFolders','{"id":"default","name":"first owner"}',NULL);
SELECT public.sync_compare_and_swap('contents','{"id":"shared-builtin","title":"first owner","type":"word","text":"word"}',NULL);
DO $$ DECLARE entity text; BEGIN
  FOREACH entity IN ARRAY ARRAY['books','collections','weakSpots','pronunciationProgress','learningAttempts','dailyTasks'] LOOP
    EXECUTE format('INSERT INTO public.%I(id,user_id,data) VALUES ($1,auth.uid(),$2)',entity) USING 'same-id','{"test":1}'::jsonb;
  END LOOP;
END $$;
SET LOCAL request.jwt.claim.sub = 'e0000000-0000-0000-0000-000000000002';
SELECT public.sync_compare_and_swap('favoriteFolders','{"id":"default","name":"second owner"}',NULL);
SELECT public.sync_compare_and_swap('contents','{"id":"shared-builtin","title":"second owner","type":"word","text":"word"}',NULL);
DO $$ BEGIN
  IF (SELECT count(*) FROM public."favoriteFolders") != 1 OR (SELECT name FROM public."favoriteFolders" WHERE id='default') != 'second owner' THEN RAISE EXCEPTION 'shared folder ID account isolation failed'; END IF;
  IF (SELECT count(*) FROM public.contents WHERE id='shared-builtin') != 1 THEN RAISE EXCEPTION 'shared content ID account isolation failed'; END IF;
END $$;
DO $$ DECLARE entity text; visible integer; BEGIN
  FOREACH entity IN ARRAY ARRAY['books','collections','weakSpots','pronunciationProgress','learningAttempts','dailyTasks'] LOOP
    EXECUTE format('SELECT count(*) FROM public.%I',entity) INTO visible;
    IF visible != 0 THEN RAISE EXCEPTION 'Cross-account read on %',entity; END IF;
    EXECUTE format('INSERT INTO public.%I(id,user_id,data) VALUES ($1,auth.uid(),$2)',entity) USING 'same-id','{"test":2}'::jsonb;
    PERFORM public.sync_compare_and_swap(entity,'{"id":"same-id","data":{"test":3}}',1);
    BEGIN
      EXECUTE format('INSERT INTO public.%I(id,user_id,data) VALUES ($1,$2,$3)',entity) USING 'forbidden','e0000000-0000-0000-0000-000000000001'::uuid,'{}'::jsonb;
      RAISE EXCEPTION 'Cross-account write allowed on %',entity;
    EXCEPTION WHEN insufficient_privilege THEN NULL; END;
  END LOOP;
END $$;
RESET ROLE;
SET LOCAL ROLE anon;
DO $$ DECLARE entity text; BEGIN
  FOREACH entity IN ARRAY ARRAY['books','collections','weakSpots','pronunciationProgress','learningAttempts','dailyTasks'] LOOP
    BEGIN
      EXECUTE format('SELECT * FROM public.%I',entity);
      RAISE EXCEPTION 'Anonymous read allowed on %',entity;
    EXCEPTION WHEN insufficient_privilege THEN NULL; END;
  END LOOP;
END $$;
ROLLBACK;
