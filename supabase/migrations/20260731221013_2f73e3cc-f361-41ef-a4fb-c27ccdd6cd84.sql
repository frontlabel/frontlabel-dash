ALTER TABLE public.shops
  ADD COLUMN IF NOT EXISTS shop_id bigint,
  ADD COLUMN IF NOT EXISTS shop_domain text,
  ADD COLUMN IF NOT EXISTS access_token text,
  ADD COLUMN IF NOT EXISTS api_language text NOT NULL DEFAULT 'nl',
  ADD COLUMN IF NOT EXISTS plan_type text NOT NULL DEFAULT 'free_trial';

ALTER TABLE public.shops ALTER COLUMN owner_id DROP NOT NULL;

CREATE UNIQUE INDEX IF NOT EXISTS shops_shop_id_key ON public.shops (shop_id) WHERE shop_id IS NOT NULL;

DROP POLICY IF EXISTS "own shops" ON public.shops;
CREATE POLICY "own shops" ON public.shops
  FOR ALL TO authenticated
  USING (owner_id IS NOT NULL AND auth.uid() = owner_id)
  WITH CHECK (owner_id IS NOT NULL AND auth.uid() = owner_id);

DROP TRIGGER IF EXISTS set_shops_updated_at ON public.shops;
CREATE TRIGGER set_shops_updated_at BEFORE UPDATE ON public.shops
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();