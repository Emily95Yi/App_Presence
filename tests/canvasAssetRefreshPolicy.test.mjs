import assert from "node:assert/strict";
import { shouldRefreshProjectionCardImage } from "../src/canvasAssetRefreshPolicy.js";

assert.equal(shouldRefreshProjectionCardImage({ showSplash: true, isIntroJourneyActive: false }), false);
assert.equal(shouldRefreshProjectionCardImage({ showSplash: false, isIntroJourneyActive: true }), false);
assert.equal(shouldRefreshProjectionCardImage({ showSplash: false, isIntroJourneyActive: false }), true);
