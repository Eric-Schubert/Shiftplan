/**
 * Numbers requests of one kind so only the newest may store its answer: when the user switches
 * quickly, a slow older answer arriving last must not overwrite the one for the current choice.
 */
export function latestRequest() {
  let current = 0;
  return {
    start: () => ++current,
    isLatest: (request: number) => request === current,
  };
}
