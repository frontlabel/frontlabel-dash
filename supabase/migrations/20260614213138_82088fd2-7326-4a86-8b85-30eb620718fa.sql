CREATE TABLE public.price_alert_requests (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  shop_id UUID NOT NULL REFERENCES public.shops(id) ON DELETE CASCADE,
  product_handle TEXT NOT NULL,
  product_title TEXT,
  product_image_url TEXT,
  variant_id TEXT,
  email TEXT NOT NULL,
  target_price NUMERIC(12,2) NOT NULL,
  current_price NUMERIC(12,2),
  currency TEXT NOT NULL DEFAULT 'EUR',
  status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending','notified','purchased','cancelled')),
  newsletter_opt_in BOOLEAN NOT NULL DEFAULT FALSE,
  notified_at TIMESTAMPTZ,
  purchased_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX idx_par_shop_product ON public.price_alert_requests(shop_id, product_handle);
CREATE INDEX idx_par_shop_status ON public.price_alert_requests(shop_id, status);
CREATE UNIQUE INDEX idx_par_unique_pending ON public.price_alert_requests(shop_id, product_handle, lower(email)) WHERE status = 'pending';

GRANT SELECT, INSERT, UPDATE, DELETE ON public.price_alert_requests TO authenticated;
GRANT ALL ON public.price_alert_requests TO service_role;

ALTER TABLE public.price_alert_requests ENABLE ROW LEVEL SECURITY;

CREATE POLICY "own shop price alerts" ON public.price_alert_requests
  FOR ALL TO authenticated
  USING (EXISTS (SELECT 1 FROM public.shops s WHERE s.id = price_alert_requests.shop_id AND s.owner_id = auth.uid()))
  WITH CHECK (EXISTS (SELECT 1 FROM public.shops s WHERE s.id = price_alert_requests.shop_id AND s.owner_id = auth.uid()));

CREATE TRIGGER set_price_alert_requests_updated_at BEFORE UPDATE ON public.price_alert_requests
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();