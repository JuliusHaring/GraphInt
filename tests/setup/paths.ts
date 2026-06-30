export const BIBLE_PDF_URL =
  "https://csbible.com/wp-content/uploads/2018/03/CSB_Pew_Bible_2nd_Printing.pdf";

export const BIBLE_PDF_PATH = "tests/data/cs-bible.pdf";
export const BIBLE_DB_PATH = "tests/data/bible-graph.db";

/** ~12k chars keeps each LLM extraction call within context while limiting total calls. */
export const DEFAULT_CHUNK_SIZE = 12_000;
