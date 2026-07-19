import { add, subtract } from "./math.js";

export function calculate(a, b) {
  return {
    sum: add(a, b),
    difference: subtract(a, b),
  };
}
