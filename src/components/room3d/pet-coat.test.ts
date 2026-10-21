import { expect, it } from "vitest";
import { BufferAttribute, BufferGeometry, Color, Group, Mesh, MeshStandardMaterial } from "three";
import { BAKED } from "@/lib/player/coats";
import { PetSpecies } from "@/lib/game/enums";
import { PetActor } from "./pet";

function catFile() {
  const linear = (hex: string) => new Color(hex).toArray();
  const colours = [...linear(BAKED[PetSpecies.LunaCat].main), ...linear(BAKED[PetSpecies.LunaCat].second), ...linear("#2a1e14")];
  const geometry = new BufferGeometry();
  geometry.setAttribute("position", new BufferAttribute(new Float32Array(9), 3));
  geometry.setAttribute("normal", new BufferAttribute(new Float32Array([0, 1, 0, 0, 1, 0, 0, 1, 0]), 3));
  geometry.setAttribute("color", new BufferAttribute(new Float32Array(colours), 3));
  const body = new Group();
  body.name = "body";
  body.add(new Mesh(geometry, new MeshStandardMaterial()));
  const scene = new Group();
  scene.add(body);
  return { scene, geometry };
}

it("paints a coat over the baked colours only, and can always paint the classic back", () => {
  const { scene, geometry } = catFile();
  const pet = new PetActor(scene, [], null);
  const mesh = pet.body.children.find((child) => (child as Mesh).isMesh) as Mesh;
  pet.paint(BAKED[PetSpecies.LunaCat], { main: "#cdbbe6", second: "#9d88c2" });
  const colour = (i: number) => new Color().fromBufferAttribute(mesh.geometry.getAttribute("color") as BufferAttribute, i);
  expect(colour(0).getHexString()).toBe("cdbbe6");
  expect(colour(1).getHexString()).toBe("9d88c2");
  expect(colour(2).getHexString()).toBe("2a1e14");
  expect(mesh.geometry).not.toBe(geometry);
  expect(new Color().fromBufferAttribute(geometry.getAttribute("color") as BufferAttribute, 0).getHexString()).toBe("ff8a3d");
  pet.paint(BAKED[PetSpecies.LunaCat], BAKED[PetSpecies.LunaCat]);
  expect(colour(0).getHexString()).toBe("ff8a3d");
});
