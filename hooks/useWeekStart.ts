import { useCallback, useEffect, useState } from "react";
import { getSettings, updateWeekStartDay, type WeekStartDay } from "@/lib/api/settings";

export function useWeekStart() {
  const [weekStart, setWeekStart] = useState<WeekStartDay>("mon");
  const [loading, setLoading] = useState(true);

  const reload = useCallback(() => {
    getSettings()
      .then((s) => { if (s?.week_start_day) setWeekStart(s.week_start_day); })
      .catch(console.error)
      .finally(() => setLoading(false));
  }, []);

  useEffect(() => { reload(); }, [reload]);

  const update = async (day: WeekStartDay) => {
    setWeekStart(day);
    await updateWeekStartDay(day);
  };

  return { weekStart, loading, update, reload };
}
