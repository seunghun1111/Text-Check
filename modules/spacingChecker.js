import { checkText } from "./ruleChecker.js";

export function checkSpacing(text, options = {}) {
  return checkText(text, options).spacing;
}
