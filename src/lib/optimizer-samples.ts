export interface OptimizerSample {
  id: string;
  name: string;
  category: "Loops & Lookups" | "Invariant Calculation" | "String Operations" | "Recursion & Dynamic" | "Optimal Baseline";
  description: string;
  code: string;
}

export const OPTIMIZER_SAMPLES: OptimizerSample[] = [
  {
    id: "nested_loop_common",
    name: "Nested Loop Membership (O(n×m) → O(n+m))",
    category: "Loops & Lookups",
    description: "Nested loops repeatedly scanning list; optimize with hash set lookup.",
    code: `def find_common(a, b):
    result = []
    for x in a:
        for y in b:
            if x == y:
                result.append(x)
    return result

# Benchmark execution sample
sample_a = list(range(1000))
sample_b = list(range(500, 1500))
common = find_common(sample_a, sample_b)
`,
  },
  {
    id: "loop_invariant_calc",
    name: "Loop-Invariant Calculation",
    category: "Invariant Calculation",
    description: "Expensive computation repeated on every iteration; hoist outside loop.",
    code: `import math

def process_items(items, config_value):
    result = []
    for item in items:
        # Loop-invariant calculation computed on each iteration
        scale_factor = math.sqrt(config_value) * 3.14159 / 2.0
        result.append(item * scale_factor)
    return result

# Benchmark execution sample
data = list(range(5000))
processed = process_items(data, 144.0)
`,
  },
  {
    id: "string_concat_loop",
    name: "String Concatenation in Loop (O(n²) → O(n))",
    category: "String Operations",
    description: "Repeated string += allocations; optimize with str.join().",
    code: `def build_report(records):
    # Inefficient: re-allocates string buffer on each iteration
    report = ""
    for r in records:
        report += f"Record[{r}]: value={r * 2}\\n"
    return report

# Benchmark execution sample
items = list(range(2000))
output = build_report(items)
`,
  },
  {
    id: "redundant_in_list",
    name: "Repeated List Membership Check",
    category: "Loops & Lookups",
    description: "Linear 'item in list' search inside loop; convert to set.",
    code: `def filter_denied_users(user_ids, blocklist):
    allowed = []
    for uid in user_ids:
        # Linear O(m) scan per iteration
        if uid not in blocklist:
            allowed.append(uid)
    return allowed

# Benchmark execution sample
users = list(range(2000))
blocked = list(range(1000, 3000, 2))
approved = filter_denied_users(users, blocked)
`,
  },
  {
    id: "unmemoized_fibonacci",
    name: "Exponential Recursion (O(2ⁿ) → O(n))",
    category: "Recursion & Dynamic",
    description: "Unmemoized recursion causes exponential redundant calls.",
    code: `def fibonacci(n):
    # Exponential recursive calls without memoization
    if n <= 1:
        return n
    return fibonacci(n - 1) + fibonacci(n - 2)

# Benchmark execution sample
res = fibonacci(28)
`,
  },
  {
    id: "already_optimal_add",
    name: "Already Efficient Code (O(1))",
    category: "Optimal Baseline",
    description: "Direct O(1) arithmetic calculation; demonstrates no false positives.",
    code: `def calculate_discount(price: float, discount_rate: float) -> float:
    """Calculates discounted price in O(1) time and space."""
    if price < 0 or discount_rate < 0 or discount_rate > 1:
        raise ValueError("Invalid price or discount rate")
    return round(price * (1.0 - discount_rate), 2)

# Benchmark execution sample
final_price = calculate_discount(120.0, 0.15)
`,
  },
];
