import { Quaternion, Vector3, type Object3D } from "three";

const _q = new Quaternion();
const _q2 = new Quaternion();
const _a = new Vector3();
const _b = new Vector3();
const _c = new Vector3();

export function worldPosition(object: Object3D, out = new Vector3()): Vector3 {
  return out.setFromMatrixPosition(object.matrixWorld);
}

function rotateWorld(bone: Object3D, delta: Quaternion): void {
  const parent = bone.parent!;
  parent.getWorldQuaternion(_q);
  bone.getWorldQuaternion(_q2);
  _q2.premultiply(delta);
  bone.quaternion.copy(_q.invert().multiply(_q2));
  bone.updateMatrixWorld(true);
}

export function aimBone(bone: Object3D, axisLocal: Vector3, target: Vector3, weight: number, maxAngle: number): void {
  if (weight <= 0) return;
  bone.updateMatrixWorld(true);
  const origin = worldPosition(bone, _a);
  const current = _b.copy(axisLocal).transformDirection(bone.matrixWorld);
  const wanted = _c.copy(target).sub(origin).normalize();
  const angle = current.angleTo(wanted);
  if (angle < 1e-4) return;
  const limit = Math.min(angle, maxAngle) / angle;
  const delta = new Quaternion().setFromUnitVectors(current, wanted);
  rotateWorld(bone, new Quaternion().slerp(delta, weight * limit));
}

export function solveElbow(s: Vector3, t: Vector3, l1: number, l2: number, pole: Vector3): { elbow: Vector3; end: Vector3 } {
  const d = t.clone().sub(s);
  const dist = Math.min(Math.max(d.length(), Math.abs(l1 - l2) + 1e-4), l1 + l2 - 1e-4);
  const dir = d.normalize();
  const cosA = (l1 * l1 + dist * dist - l2 * l2) / (2 * l1 * dist);
  const sinA = Math.sqrt(Math.max(0, 1 - cosA * cosA));
  const p = pole.clone().sub(dir.clone().multiplyScalar(pole.dot(dir)));
  if (p.lengthSq() < 1e-10) p.set(0, -1, 0).sub(dir.clone().multiplyScalar(-dir.y));
  p.normalize();
  return {
    elbow: s.clone().addScaledVector(dir, l1 * cosA).addScaledVector(p, l1 * sinA),
    end: s.clone().addScaledVector(dir, dist),
  };
}

export function reach(upper: Object3D, lower: Object3D, hand: Object3D, target: Vector3, weight: number): void {
  if (weight <= 0) return;
  upper.updateMatrixWorld(true);
  const s = worldPosition(upper, new Vector3());
  const e = worldPosition(lower, new Vector3());
  const w = worldPosition(hand, new Vector3());
  const handWorld = hand.getWorldQuaternion(new Quaternion());
  const goal = w.clone().lerp(target, weight);
  const pole = e.clone().sub(s.clone().add(w).multiplyScalar(0.5));
  const { elbow, end } = solveElbow(s, goal, s.distanceTo(e), e.distanceTo(w), pole);

  rotateWorld(upper, new Quaternion().setFromUnitVectors(e.clone().sub(s).normalize(), elbow.clone().sub(s).normalize()));
  const e2 = worldPosition(lower, new Vector3());
  const w2 = worldPosition(hand, new Vector3());
  rotateWorld(lower, new Quaternion().setFromUnitVectors(w2.clone().sub(e2).normalize(), end.clone().sub(e2).normalize()));
  const parent = lower.getWorldQuaternion(new Quaternion());
  hand.quaternion.copy(parent.invert().multiply(handWorld));
  hand.updateMatrixWorld(true);
}

export function dampVector(current: Vector3, target: Vector3, rate: number, dt: number): Vector3 {
  return current.lerp(target, 1 - Math.exp(-rate * dt));
}

export function angleDelta(from: number, to: number): number {
  return Math.atan2(Math.sin(to - from), Math.cos(to - from));
}

export function dampAngle(current: number, target: number, rate: number, dt: number): number {
  return current + angleDelta(current, target) * (1 - Math.exp(-rate * dt));
}
