const IMAGE_SOURCES = Object.freeze({
  arena: "/back_game.png",
  menu: "/book_menu.png",
  hero: "/sprite_char_transparente.png",
  enemy: "/fireball_game_shoot.png",
});

function loadImage(source) {
  return new Promise((resolve, reject) => {
    const image = new Image();
    image.addEventListener("load", () => resolve(image), { once: true });
    image.addEventListener(
      "error",
      () => reject(new Error(`Could not load ${source}`)),
      { once: true },
    );
    image.src = source;
  });
}

export async function loadGameAssets(onProgress = () => {}) {
  const entries = Object.entries(IMAGE_SOURCES);
  let loaded = 0;

  const assets = await Promise.all(
    entries.map(async ([name, source]) => {
      const image = await loadImage(source);
      loaded += 1;
      onProgress(loaded / entries.length);
      return [name, image];
    }),
  );

  return Object.fromEntries(assets);
}
