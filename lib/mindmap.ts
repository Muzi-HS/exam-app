import type { SupabaseClient } from "@supabase/supabase-js";
import type { Database, MindmapDomain } from "@/types/database";

export interface MindmapNode {
  id: string;
  parent_node_id: string | null;
  name: string;
  description: string | null;
  keywords: string | null;
  memo: string | null;
  order_index: number;
  is_collapsed: boolean;
  position_x: number | null;
  position_y: number | null;
  is_blank: boolean;
}

export async function fetchNodes(
  supabase: SupabaseClient<Database>,
  topicId: string
): Promise<MindmapNode[]> {
  const { data, error } = await supabase
    .from("mindmap_nodes")
    .select(
      "id, parent_node_id, name, description, keywords, memo, order_index, is_collapsed, position_x, position_y, is_blank"
    )
    .eq("topic_id", topicId)
    .order("order_index", { ascending: true });
  if (error) throw error;
  return data ?? [];
}

export async function createNode(
  supabase: SupabaseClient<Database>,
  params: {
    topicId: string;
    domain: MindmapDomain;
    userId: string;
    parentNodeId: string | null;
    name: string;
    orderIndex: number;
    positionX?: number | null;
    positionY?: number | null;
  }
): Promise<string> {
  const { data, error } = await supabase
    .from("mindmap_nodes")
    .insert({
      topic_id: params.topicId,
      domain: params.domain,
      user_id: params.userId,
      parent_node_id: params.parentNodeId,
      name: params.name,
      order_index: params.orderIndex,
      position_x: params.positionX ?? null,
      position_y: params.positionY ?? null,
    })
    .select("id")
    .single();
  if (error || !data) throw error ?? new Error("노드를 생성하지 못했습니다.");
  return data.id;
}

export async function updateNode(
  supabase: SupabaseClient<Database>,
  id: string,
  patch: Partial<{
    name: string;
    description: string | null;
    keywords: string | null;
    memo: string | null;
    parent_node_id: string | null;
    is_collapsed: boolean;
    position_x: number | null;
    position_y: number | null;
    order_index: number;
    is_blank: boolean;
  }>
) {
  const { error } = await supabase.from("mindmap_nodes").update(patch).eq("id", id);
  if (error) throw error;
}

export async function deleteNode(supabase: SupabaseClient<Database>, id: string) {
  const { error } = await supabase.from("mindmap_nodes").delete().eq("id", id);
  if (error) throw error;
}

// node와 그 모든 하위 노드 id (부모 변경 시 순환 참조를 막기 위한 용도)
export function getDescendantIds(nodeId: string, nodes: MindmapNode[]): Set<string> {
  const childrenByParent = new Map<string, MindmapNode[]>();
  for (const n of nodes) {
    if (!n.parent_node_id) continue;
    if (!childrenByParent.has(n.parent_node_id)) childrenByParent.set(n.parent_node_id, []);
    childrenByParent.get(n.parent_node_id)!.push(n);
  }
  const result = new Set<string>();
  function visit(id: string) {
    for (const child of childrenByParent.get(id) ?? []) {
      if (!result.has(child.id)) {
        result.add(child.id);
        visit(child.id);
      }
    }
  }
  visit(nodeId);
  return result;
}
