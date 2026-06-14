CREATE TABLE public.back_in_stock_requests (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  shop_id uuid NOT NULL REFERENCES public.shops(id) ON DELETE CASCADE,
  product_handle text NOT NULL,
  product_title text,
  product_image_url text,
  variant_id text,
  email text NOT NULL,
  status text NOT NULL DEFAULT 'pending' CHECK (status IN ('pending','notified','purchased','cancelled')),
  newsletter_opt_in boolean NOT NULL DEFAULT false,
  notified_at timestamptz,
  purchased_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX idx_bisr_shop_status ON public.back_in_stock_requests(shop_id, status);
CREATE INDEX idx_bisr_shop_product ON public.back_in_stock_requests(shop_id, product_handle);
CREATE UNIQUE INDEX idx_bisr_unique_pending ON public.back_in_stock_requests(shop_id, product_handle, lower(email)) WHERE status = 'pending';

GRANT SELECT, INSERT, UPDATE, DELETE ON public.back_in_stock_requests TO authenticated;
GRANT ALL ON public.back_in_stock_requests TO service_role;

ALTER TABLE public.back_in_stock_requests ENABLE ROW LEVEL SECURITY;

CREATE POLICY "own shop waitlist" ON public.back_in_stock_requests
  FOR ALL TO authenticated
  USING (EXISTS (SELECT 1 FROM public.shops s WHERE s.id = back_in_stock_requests.shop_id AND s.owner_id = auth.uid()))
  WITH CHECK (EXISTS (SELECT 1 FROM public.shops s WHERE s.id = back_in_stock_requests.shop_id AND s.owner_id = auth.uid()));

CREATE TRIGGER set_back_in_stock_requests_updated_at
  BEFORE UPDATE ON public.back_in_stock_requests
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();