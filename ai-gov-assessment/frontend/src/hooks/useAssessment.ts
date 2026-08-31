import { useEffect, useState, useCallback } from "react";
import { api } from "@/lib/api";
import { Assessment } from "@/types/api";

export function useAssessment(id: string | undefined) {
  const [data, setData] = useState<Assessment | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const reload = useCallback(() => {
    if (!id) return;
    setLoading(true);
    api
      .getAssessment(id)
      .then((res) => {
        setData(res);
        setError(null);
      })
      .catch((err) => setError(err.message))
      .finally(() => setLoading(false));
  }, [id]);

  useEffect(() => {
    reload();
  }, [reload]);

  return { data, loading, error, reload };
}
