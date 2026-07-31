import { Save } from "lucide-react";
import { Button } from "@/components/ui/button";

export function StickySaveBar({
  onSave,
  saving,
}: {
  onSave: () => void;
  saving?: boolean;
}) {
  return (
    <div className="sticky bottom-0 z-10 mt-8 border-t border-gray-200 bg-white/90 px-6 py-3 backdrop-blur">
      <div className="flex justify-end">
        <Button onClick={onSave} disabled={saving} className="rounded-lg">
          <Save className="h-4 w-4" />
          {saving ? "Opslaan…" : "Opslaan"}
        </Button>
      </div>
    </div>
  );
}