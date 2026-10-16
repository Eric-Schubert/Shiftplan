/**
 * Files that import each other in a cycle, as sorted groups (strongly connected components, Tarjan).
 * `edges` is a list of { from, to } between repo files.
 */
export function findCycles(edges) {
  const graph = new Map();
  for (const { from, to } of edges) graph.set(from, [...(graph.get(from) ?? []), to]);

  const order = new Map();
  const low = new Map();
  const stack = [];
  const onStack = new Set();
  const cycles = [];

  const visit = (node) => {
    order.set(node, order.size);
    low.set(node, order.get(node));
    stack.push(node);
    onStack.add(node);
    for (const next of graph.get(node) ?? []) {
      if (!order.has(next)) visit(next);
      if (onStack.has(next)) low.set(node, Math.min(low.get(node), low.get(next)));
    }
    if (low.get(node) !== order.get(node)) return;
    const group = [];
    let member;
    do {
      member = stack.pop();
      onStack.delete(member);
      group.push(member);
    } while (member !== node);
    if (group.length > 1 || (graph.get(node) ?? []).includes(node)) cycles.push(group.sort());
  };

  for (const node of graph.keys()) if (!order.has(node)) visit(node);
  return cycles;
}
