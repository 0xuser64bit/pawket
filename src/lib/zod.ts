/**
 * The parts of Zod the browser uses, by name. `import { z } from "zod"` is a
 * namespace that also holds every one of Zod's sixty-four locales, and the
 * bundler kept them all in the browser's shared code — half of its largest
 * chunk. Named, the rest is left out; English is still registered by Zod's
 * own schemas. Code that only runs on the server may keep `zod`.
 */
export { array, boolean, enum, literal, nativeEnum, number, object, preprocess, record, string, unknown, ZodIssueCode } from "zod";
export type { infer, ZodNullable, ZodString } from "zod";
