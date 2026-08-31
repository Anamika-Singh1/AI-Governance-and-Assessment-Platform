import { useEffect, useState, useCallback } from "react";
import { api } from "@/lib/api";
import { AssessmentListItem } from "@/types/api";

export function useAssessments() {
  const [items, setItems] = useState<AssessmentListItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const reload = useCallback(() => {
    setLoading(true);
    api
      .listAssessments()
      .then((data) => {
        setItems(data);
        setError(null);
      })
      .catch((err) => setError(err.message))
      .finally(() => setLoading(false));
  }, []);

  useEffect(() => {
    reload();
  }, [reload]);

  return { items, loading, error, reload };
}
