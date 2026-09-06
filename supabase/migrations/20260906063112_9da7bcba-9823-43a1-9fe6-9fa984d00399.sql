CREATE TABLE public.product_optimizations (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  shop_id uuid NOT NULL REFERENCES public.shops(id) ON DELETE CASCADE,
  product_ref text NOT NULL,
  product_title text,
  score integer NOT NULL DEFAULT 0,
  suggestions jsonb NOT NULL DEFAULT '{}'::jsonb,
  image_urls text[] NOT NULL DEFAULT '{}'::text[],
  status text NOT NULL DEFAULT 'suggested',
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  updated_at timestamp with time zone NOT NULL DEFAULT now(),
  UNIQUE (shop_id, product_ref)
);

GRANT SELECT, INSERT, UPDATE, DELETE ON public.product_optimizations TO authenticated;
GRANT ALL ON public.product_optimizations TO service_role;

ALTER TABLE public.product_optimizations ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Shop owners manage their product optimizations"
ON public.product_optimizations
FOR ALL
TO authenticated
USING (EXISTS (SELECT 1 FROM public.shops s WHERE s.id = product_optimizations.shop_id AND s.owner_id = auth.uid()))
WITH CHECK (EXISTS (SELECT 1 FROM public.shops s WHERE s.id = product_optimizations.shop_id AND s.owner_id = auth.uid()));

CREATE TRIGGER set_product_optimizations_updated_at
BEFORE UPDATE ON public.product_optimizations
FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();