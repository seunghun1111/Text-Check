export function rewriteStyle(text, _mode = "natural") {
  return {
    originalText: text,
    rewrittenText: text,
    status: "skipped",
    reason: "Rule-based style rewriting will be added in a later version."
  };
}
