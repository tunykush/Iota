import type { SnapshotConfig } from "boneyard-js";

export const IOTA_BONEYARD_SNAPSHOT_CONFIG: SnapshotConfig = {
  captureRoundedBorders: true,
  excludeTags: ["svg"],
  excludeSelectors: ["[data-no-skeleton]"],
  leafTags: ["p", "h1", "h2", "h3", "h4", "h5", "h6", "li", "tr", "a", "button"],
};
