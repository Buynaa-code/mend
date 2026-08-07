/* eslint-disable @next/next/no-img-element */

import { getMascot, type MascotCharacter } from "./lib/greeting";

export type MascotVariant =
  | "intro"
  | "pout"
  | "celebrate"
  | "camera"
  | "letter"
  | "music"
  | "cake";

/**
 * Зургийн нэр `{asset}{suffix}.png` хэлбэртэй — жишээ нь
 * `mend-giraffe.png`, `mend-giraffe-cake.png`. Шинэ дүр нэмэхэд
 * `mascotOptions`-д нэг мөр нэмэхэд л хангалттай.
 */
const variantSuffix: Record<MascotVariant, string> = {
  intro: "",
  pout: "-pout",
  celebrate: "-celebrate",
  camera: "-camera",
  letter: "-letter",
  music: "-music",
  cake: "-cake",
};

export function mascotSource(
  character: MascotCharacter | undefined,
  variant: MascotVariant,
) {
  const option = getMascot(character ?? "fawn");
  return `/assets/${option.asset}${variantSuffix[variant]}.png`;
}

export function Mascot({
  variant,
  character = "fawn",
  className = "",
}: {
  variant: MascotVariant;
  character?: MascotCharacter;
  className?: string;
}) {
  return (
    <img
      className={`mascot ${className}`.trim()}
      src={mascotSource(character, variant)}
      alt=""
      draggable={false}
    />
  );
}
