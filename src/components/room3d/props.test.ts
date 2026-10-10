import { Vector3 } from "three";
import { describe, expect, it } from "vitest";
import { brushHeadAt, makeProp } from "./props";

describe("brush grip", () => {
  it.each([new Vector3(0.04, -0.02, 0.03), new Vector3(-0.03, 0.01, -0.04)])(
    "keeps the handle in the palm and the bristles below the head",
    (fingers) => {
      const wrist = new Vector3(0.2, 0.7, -0.1);
      const palm = wrist.clone().add(fingers);
      const brush = makeProp("brush").object;
      brush.position.copy(brushHeadAt(palm, wrist));
      brush.rotation.y = Math.atan2(brush.position.x - palm.x, brush.position.z - palm.z);
      brush.updateMatrixWorld(true);

      const [handle, head, bristles] = brush.children;
      expect(handle.getWorldPosition(new Vector3()).distanceTo(palm)).toBeLessThan(1e-6);
      expect(bristles.getWorldPosition(new Vector3()).y).toBeLessThan(head.getWorldPosition(new Vector3()).y);
      expect(palm).toEqual(wrist.clone().add(fingers));
    },
  );
});
