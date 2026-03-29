import type { SimNode, Classifier } from "../types/graph-ir";

export function getNodeColor(node: SimNode, classifiers: Classifier[], overrides?: Record<string, string>): string {
  // Use the first classifier whose values carry color definitions
  const colorCls = classifiers.find((c) => c.values.some((v) => v.color)) ?? classifiers[0];
  if (!colorCls) return "#666";
  const valueId = node.classifiers?.[colorCls.id];
  if (!valueId) return "#666";
  if (overrides && overrides[String(valueId)]) return overrides[String(valueId)];
  return colorCls.values.find((v) => v.id === String(valueId))?.color ?? "#666";
}
