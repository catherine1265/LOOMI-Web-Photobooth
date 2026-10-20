import { useEffect, useMemo, useRef, useState } from "react";
import { Image as KonvaImage, Layer, Rect, Stage, Transformer } from "react-konva";
import { effects } from "../../../config/effects.js";
import { getSlotRects, printSpec } from "../../../printSpec.js";
import { buildPhotoCanvas, coverCrop, loadImage, readTheme, toRgba } from "../../../stripAssets.js";
import { StickerNode, TextNode } from "./StripItems.jsx";

const ANCHORS = ["top-left", "top-right", "bottom-left", "bottom-right"];
const MIN_ITEM_SIZE = 20;
const ANCHOR_SIZE = 8;
const ROTATE_OFFSET = 22;

function usePreviewHeight() {
  const read = () =>
    window.innerWidth <= 900 ? 420 : Math.max(Math.min(window.innerHeight - 290, 640), 240);
  const [height, setHeight] = useState(read);

  useEffect(() => {
    const handleResize = () => setHeight(read());
    window.addEventListener("resize", handleResize);
    return () => window.removeEventListener("resize", handleResize);
  }, []);

  return height;
}

function usePhotoCanvases(photos, effectId, rects) {
  const [canvases, setCanvases] = useState([]);

  useEffect(() => {
    let cancelled = false;
    const filter = effects.find((effect) => effect.id === effectId)?.filter ?? "none";

    Promise.all(
      photos.map(async (photo) => {
        const rect = rects[photo.slotIndex];
        if (!rect) return null;
        const image = await loadImage(photo.src);
        return { rect, canvas: buildPhotoCanvas(image, rect.width, rect.height, filter) };
      })
    )
      .then((result) => !cancelled && setCanvases(result.filter(Boolean)))
      .catch(() => {});

    return () => {
      cancelled = true;
    };
  }, [photos, effectId, rects]);

  return canvases;
}

function useBackgroundImage(background) {
  const [image, setImage] = useState(null);

  useEffect(() => {
    let cancelled = false;
    if (!background?.src) {
      setImage(null);
      return;
    }
    loadImage(background.src)
      .then((loaded) => !cancelled && setImage(loaded))
      .catch(() => {});
    return () => {
      cancelled = true;
    };
  }, [background]);

  return image;
}

export default function StripCanvas({
  session,
  edits,
  selectedId,
  onSelect,
  onChange,
  stageRef,
  transformerRef,
}) {
  const containerRef = useRef(null);
  const nodesRef = useRef(new Map());
  const [theme, setTheme] = useState({ background: "#fff5cb", ink: "#652b2b" });

  const spec = printSpec[session.frameType];
  const rects = useMemo(() => getSlotRects(spec), [spec]);
  const photoCanvases = usePhotoCanvases(session.photos, edits.effectId, rects);
  const backgroundImage = useBackgroundImage(edits.background);

  const previewHeight = usePreviewHeight();
  const previewWidth = Math.round((previewHeight * spec.width) / spec.height);
  const scale = previewWidth / spec.width;

  useEffect(() => {
    setTheme(readTheme(containerRef.current));
  }, []);

  const items = useMemo(
    () =>
      [
        ...edits.stickers.map((item) => ({ kind: "sticker", item })),
        ...edits.texts.map((item) => ({ kind: "text", item })),
      ].sort((first, second) => first.item.z - second.item.z),
    [edits.stickers, edits.texts]
  );

  useEffect(() => {
    const transformer = transformerRef.current;
    if (!transformer) return;

    const node = selectedId ? nodesRef.current.get(selectedId) : null;
    transformer.nodes(node ? [node] : []);
    transformer.getLayer()?.batchDraw();
  }, [selectedId, items, transformerRef]);

  function register(id, node) {
    if (node) nodesRef.current.set(id, node);
    else nodesRef.current.delete(id);
  }

  function dragBound(position) {
    return {
      x: Math.min(Math.max(position.x, 0), previewWidth),
      y: Math.min(Math.max(position.y, 0), previewHeight),
    };
  }

  function handleStagePointer(event) {
    if (event.target === event.target.getStage()) onSelect(null);
  }

  const backgroundCrop = backgroundImage
    ? coverCrop(backgroundImage, spec.width, spec.height, 0)
    : null;

  return (
    <div className="edit-strip">
      {/* Badan printer: pil biru + garis pink di tengah */}
      <div className="edit-strip__slot" aria-hidden="true">
        <div className="edit-strip__slot-bar" />
      </div>

      {/* Kertas strip: keluar dari bawah garis pink */}
      <div className="edit-strip__stage" ref={containerRef}>
        <Stage
          ref={stageRef}
          width={previewWidth}
          height={previewHeight}
          scaleX={scale}
          scaleY={scale}
          onMouseDown={handleStagePointer}
          onTouchStart={handleStagePointer}
        >
          <Layer listening={false}>
            {edits.background?.type === "color" ? (
              <Rect
                x={0}
                y={0}
                width={spec.width}
                height={spec.height}
                fill={toRgba(edits.background.value, edits.background.alpha)}
              />
            ) : (
              <Rect x={0} y={0} width={spec.width} height={spec.height} fill={theme.background} />
            )}
            {backgroundImage && (
              <KonvaImage
                image={backgroundImage}
                x={0}
                y={0}
                width={spec.width}
                height={spec.height}
                crop={backgroundCrop}
              />
            )}
          </Layer>

          <Layer listening={false}>
            {photoCanvases.map(({ rect, canvas }) => (
              <KonvaImage
                key={`${rect.x}-${rect.y}`}
                image={canvas}
                x={rect.x}
                y={rect.y}
                width={rect.width}
                height={rect.height}
              />
            ))}
          </Layer>

          <Layer>
            {items.map(({ kind, item }) =>
              kind === "sticker" ? (
                <StickerNode
                  key={item.id}
                  item={item}
                  register={register}
                  onSelect={onSelect}
                  onChange={onChange}
                  dragBound={dragBound}
                />
              ) : (
                <TextNode
                  key={item.id}
                  item={item}
                  register={register}
                  onSelect={onSelect}
                  onChange={onChange}
                  dragBound={dragBound}
                />
              )
            )}
          </Layer>

          <Layer>
            <Transformer
              ref={transformerRef}
              rotateEnabled
              keepRatio
              flipEnabled={false}
              enabledAnchors={ANCHORS}
              borderStroke={theme.ink}
              anchorStroke={theme.ink}
              anchorFill="#fff"
              anchorSize={ANCHOR_SIZE}
              anchorStrokeWidth={1}
              borderStrokeWidth={1}
              rotateAnchorOffset={ROTATE_OFFSET}
              boundBoxFunc={(oldBox, newBox) =>
                newBox.width < MIN_ITEM_SIZE || newBox.height < MIN_ITEM_SIZE ? oldBox : newBox
              }
            />
          </Layer>
        </Stage>
      </div>
    </div>
  );
}