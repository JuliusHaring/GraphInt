import { GraphSchema } from "../ontology.js";
import { z } from "zod";

export const IngestionResultSchema = GraphSchema.clone();
export type IngestionResult = z.infer<typeof IngestionResultSchema>;
