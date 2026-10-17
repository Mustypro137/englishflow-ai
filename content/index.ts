/** All curriculum content, in level order. The seed script and content tests read from here. */
import * as labs from "./labs";
import { a1 } from "./levels/a1";
import { a2, b1, b2, c1, c2 } from "./levels/outlines";
import { placementItems } from "./placement";
import { a1Vocabulary } from "./vocabulary/a1";

export const curriculum = [a1, a2, b1, b2, c1, c2];
export const vocabulary = [a1Vocabulary];
export { placementItems };
export { labs };
