import { useEffect, useLayoutEffect, useRef, useState } from "react";
import { Image as KonvaImage, Text as KonvaText } from "react-konva";
import { loadImage } from "../../../stripAssets.js";
import { fonts } from "../editorData.js";

function useLoadedImage(src) {
  const [image, setImage] = useState(null);

  useEffect(() => {
    let cancelled = false;
    loadImage(src)
      .then((loaded) => !cancelled && setImage(loaded))
      .catch(() => {});
    return () => {
      cancelled = true;
    };
  }, [src]);

  return image;
}

function fontFamilyOf(fontId) {
  return fonts.find((font) => font.id === fontId)?.family ?? "serif";
}

export function StickerNode({ item, register, onSelect, onChange, dragBound }) {
  const image = useLoadedImage(item.src);
  if (!image) return null;

  const height = item.width / item.aspect;

  return (
    <KonvaImage
      ref={(node) => register(item.id, node)}
      image={image}
      x={item.x}
      y={item.y}
      width={item.width}
      height={height}
      offsetX={item.width / 2}
      offsetY={height / 2}
      rotation={item.rotation}
      scaleX={item.scaleX}
      scaleY={item.scaleY}
      draggable
      dragBoundFunc={dragBound}
      onMouseDown={() => onSelect(item.id)}
      onTouchStart={() => onSelect(item.id)}
      onDragEnd={(event) => onChange(item.id, { x: event.target.x(), y: event.target.y() })}
      onTransformEnd={(event) => {
        const node = event.target;
        onChange(item.id, {
          x: node.x(),
          y: node.y(),
          rotation: node.rotation(),
          scaleX: node.scaleX(),
          scaleY: node.scaleY(),
        });
      }}
    />
  );
}

export function TextNode({ item, register, onSelect, onChange, dragBound }) {
  const nodeRef = useRef(null);
  const [fontTick, setFontTick] = useState(0);
  const family = fontFamilyOf(item.fontId);

  useEffect(() => {
    let cancelled = false;
    document.fonts
      .load(`${item.fontSize}px "${family}"`, item.text)
      .then(() => !cancelled && setFontTick((tick) => tick + 1))
      .catch(() => {});
    return () => {
      cancelled = true;
    };
  }, [family, item.text, item.fontSize]);

  useLayoutEffect(() => {
    const node = nodeRef.current;
    if (!node) return;
    node.offsetX(node.width() / 2);
    node.offsetY(node.height() / 2);
    node.getLayer()?.batchDraw();
  }, [item.text, item.fontSize, family, fontTick]);

  return (
    <KonvaText
      ref={(node) => {
        nodeRef.current = node;
        register(item.id, node);
      }}
      text={item.text}
      fontFamily={`"${family}"`}
      fontSize={item.fontSize}
      fill={item.color}
      x={item.x}
      y={item.y}
      rotation={item.rotation}
      scaleX={item.scaleX}
      scaleY={item.scaleY}
      draggable
      dragBoundFunc={dragBound}
      onMouseDown={() => onSelect(item.id)}
      onTouchStart={() => onSelect(item.id)}
      onDragEnd={(event) => onChange(item.id, { x: event.target.x(), y: event.target.y() })}
      onTransformEnd={(event) => {
        const node = event.target;
        const fontSize = node.fontSize() * node.scaleX();
        node.scaleX(1);
        node.scaleY(1);
        onChange(item.id, {
          x: node.x(),
          y: node.y(),
          rotation: node.rotation(),
          fontSize,
          scaleX: 1,
          scaleY: 1,
        });
      }}
    />
  );
}
