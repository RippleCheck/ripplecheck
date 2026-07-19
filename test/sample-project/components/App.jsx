import { Button } from "./Button.jsx";
import { calculate } from "../utils/calculator.js";

export function App() {
  const result = calculate(2, 3);

  return (
    <div>
      <p>Sum: {result.sum}</p>
      <Button label="Recalculate" onClick={() => calculate(5, 1)} />
    </div>
  );
}
