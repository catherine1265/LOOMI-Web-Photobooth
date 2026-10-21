const poseFiles = import.meta.glob("../../../../assets/pose-ideas/*.{png,jpg,jpeg,webp}", {
  eager: true,
  import: "default",
});

export const poses = Object.entries(poseFiles)
  .sort(([first], [second]) => first.localeCompare(second, undefined, { numeric: true }))
  .map(([path, src]) => ({
    id: path.split("/").pop().replace(/\.[^.]+$/, ""),
    src,
  }));
