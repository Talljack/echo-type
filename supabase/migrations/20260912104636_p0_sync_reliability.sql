-- Additive only. Deploy to a staging project and validate RLS before production.
ALTER TABLE public.contents ADD COLUMN IF NOT EXISTS deleted_at timestamptz;
-- Older installations provisioned these outside source-controlled migrations.
CREATE TABLE IF NOT EXISTS public."favoriteFolders" (
  id text NOT NULL, user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  name text NOT NULL, emoji text NOT NULL DEFAULT '', color text, sort_order integer DEFAULT 0,
  created_at timestamptz DEFAULT now(), updated_at timestamptz DEFAULT now(), PRIMARY KEY(user_id,id)
);
CREATE TABLE IF NOT EXISTS public.favorites (
  id text NOT NULL, user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  text text NOT NULL, normalized_text text NOT NULL, translation text NOT NULL DEFAULT '', type text NOT NULL,
  folder_id text NOT NULL DEFAULT 'default', source_content_id text, source_module text, context text,
  target_lang text NOT NULL, pronunciation text, notes text, related jsonb, fsrs_card jsonb,
  next_review timestamptz, auto_collected boolean DEFAULT false,
  created_at timestamptz DEFAULT now(), updated_at timestamptz DEFAULT now(), PRIMARY KEY(user_id,id)
);
DO $$ DECLARE entity text; BEGIN
  FOREACH entity IN ARRAY ARRAY['favorites','favoriteFolders'] LOOP
    EXECUTE format('ALTER TABLE public.%I ENABLE ROW LEVEL SECURITY',entity);
    EXECUTE format('REVOKE ALL ON public.%I FROM anon',entity);
    EXECUTE format('GRANT SELECT,INSERT,UPDATE,DELETE ON public.%I TO authenticated',entity);
    IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE schemaname='public' AND tablename=entity AND policyname='owner_access') THEN
      EXECUTE format('CREATE POLICY owner_access ON public.%I FOR ALL TO authenticated USING ((select auth.uid())=user_id) WITH CHECK ((select auth.uid())=user_id)',entity);
    END IF;
  END LOOP;
END $$;
-- Some installations created favorites outside the original checked-in migration.
DO $$ BEGIN
  IF to_regclass('public."favoriteFolders"') IS NOT NULL THEN
    ALTER TABLE public."favoriteFolders" ADD COLUMN IF NOT EXISTS updated_at timestamptz DEFAULT now();
  END IF;
END $$;

DO $$ DECLARE entity text; BEGIN
  FOREACH entity IN ARRAY ARRAY['books','collections','weakSpots','pronunciationProgress','learningAttempts','dailyTasks'] LOOP
    EXECUTE format('CREATE TABLE IF NOT EXISTS public.%I (id text NOT NULL, user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE, data jsonb NOT NULL, updated_at timestamptz NOT NULL DEFAULT now(), PRIMARY KEY (user_id,id))', entity);
    EXECUTE format('ALTER TABLE public.%I ENABLE ROW LEVEL SECURITY', entity);
    EXECUTE format('REVOKE ALL ON public.%I FROM anon', entity);
    EXECUTE format('GRANT SELECT, INSERT, UPDATE, DELETE ON public.%I TO authenticated', entity);
    EXECUTE format('CREATE POLICY owner_access ON public.%I FOR ALL TO authenticated USING ((select auth.uid()) = user_id) WITH CHECK ((select auth.uid()) = user_id)', entity);
    EXECUTE format('CREATE INDEX ON public.%I (user_id,updated_at,id)', entity);
  END LOOP;
END $$;
