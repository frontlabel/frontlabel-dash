import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";

export function useIsAdmin() {
  const [isAdmin, setIsAdmin] = useState<boolean | null>(null);
  useEffect(() => {
    let cancelled = false;
    supabase.auth.getUser().then(({ data }) => {
      const uid = data.user?.id;
      if (!uid) {
        if (!cancelled) setIsAdmin(false);
        return;
      }
      supabase
        .from("user_roles")
        .select("role")
        .eq("user_id", uid)
        .eq("role", "admin")
        .maybeSingle()
        .then(({ data }) => {
          if (!cancelled) setIsAdmin(!!data);
        });
    });
    return () => {
      cancelled = true;
    };
  }, []);
  return isAdmin;
}