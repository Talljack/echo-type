-- ============================================
-- EchoType - Practice Notebook (journals) sync table
-- ============================================

CREATE TABLE public.journals (
  id TEXT PRIMARY KEY,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  title TEXT NOT NULL,
  topic TEXT,
  tags TEXT[] DEFAULT '{}',
  lesson_date TEXT NOT NULL,
  source TEXT NOT NULL DEFAULT 'manual',
  turns JSONB NOT NULL DEFAULT '[]',
  notes TEXT,
  content_ids TEXT[],
  deleted_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

CREATE INDEX idx_journals_user ON public.journals(user_id);
CREATE INDEX idx_journals_updated ON public.journals(updated_at);
CREATE INDEX idx_journals_deleted ON public.journals(deleted_at);

ALTER TABLE public.journals ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users own their journals"
  ON public.journals FOR ALL USING (auth.uid() = user_id);

CREATE TRIGGER update_journals_updated_at
  BEFORE UPDATE ON public.journals
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at();
