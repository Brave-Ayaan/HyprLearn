/** Exact theoretical probability distribution for the sum of `numDice` d`sides`, via convolution. */
export function theoreticalDistribution(numDice: number, sides: number): number[] {
  let current = [1]; // ways to reach each sum, starting from "0 dice rolled -> sum 0" with weight 1
  for (let d = 0; d < numDice; d++) {
    const next = new Array(current.length + sides - 1).fill(0);
    for (let s = 0; s < current.length; s++) {
      for (let face = 1; face <= sides; face++) {
        next[s + face - 1] += current[s];
      }
    }
    current = next;
  }
  const total = Math.pow(sides, numDice);
  return current.map((w) => w / total); // index i corresponds to sum = numDice + i
}

export function rollOnce(numDice: number, sides: number): number {
  let sum = 0;
  for (let i = 0; i < numDice; i++) sum += 1 + Math.floor(Math.random() * sides);
  return sum;
}
