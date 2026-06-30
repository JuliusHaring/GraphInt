declare module "word-extractor" {
  export default class WordExtractor {
    extract(source: Buffer | string): Promise<WordDocument>;
  }

  export interface WordDocument {
    getBody(): string;
  }
}
