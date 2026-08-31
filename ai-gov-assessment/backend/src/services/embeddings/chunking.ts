/**
 * Sentence-boundary-aware chunker. Targets ~300-500 characters per chunk
 * (roughly the assignment's "~300-500 token" guidance, scaled for our
 * short curated-source descriptions rather than full document text) —
 * never splits mid-sentence, so a retrieved chunk always reads as a
 * complete, citable statement.
 */
export function chunkText(text: string, targetSize = 400): string[] {
  const sentences = text
    .split(/(?<=[.!?])\s+/)
    .map((s) => s.trim())
    .filter(Boolean);

  const chunks: string[] = [];
  let current = "";
  for (const sentence of sentences) {
    if (current && (current.length + sentence.length + 1) > targetSize) {
      chunks.push(current.trim());
      current = sentence;
    } else {
      current = current ? `${current} ${sentence}` : sentence;
    }
  }
  if (current.trim()) chunks.push(current.trim());
  return chunks.length ? chunks : [text];
}
