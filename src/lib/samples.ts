export const SAMPLES: { label: string; code: string }[] = [
  {
    label: "two_sum",
    code: `def two_sum(nums, target):
    seen = {}
    for i, n in enumerate(nums):
        rest = target - n
        if rest in seen:
            return [seen[rest], i]
        seen[n] = i
    return []

print(two_sum([2, 7, 11, 15], 9))`,
  },
  {
    label: "buggy_average",
    code: `def average(values):
    total = 0
    for v in values:
        total += v
    return total / len(values)

def report(rows):
    result = []
    for row in rows:
        result.append(average(row))
    return result

print(report([[1, 2, 3], []]))`,
  },
  {
    label: "bubble_sort",
    code: `def bubble_sort(items):
    data = list(items)
    for i in range(len(data)):
        for j in range(len(data) - 1):
            if data[j] > data[j + 1]:
                temp = data[j]
                data[j] = data[j + 1]
                data[j + 1] = temp
    return data

print(bubble_sort([5, 3, 8, 1]))`,
  },
  {
    label: "matrix_aliasing",
    code: `def create_matrix(rows, cols):
    # Shallow copy bug: all rows reference the same memory list
    grid = [[0] * cols] * rows
    grid[0][0] = 99
    return grid

matrix = create_matrix(3, 4)
print(matrix)`,
  },
  {
    label: "mutating_iteration",
    code: `def filter_negatives(numbers=[]):
    # Mutable default argument + mutating list while iterating
    for n in numbers:
        if n < 0:
            numbers.remove(n)
    return numbers

print(filter_negatives([-1, -2, 3, -4, 5]))`,
  },
  {
    label: "recursive_fibonacci",
    code: `def fibonacci(n):
    # Exponential O(2^N) complexity with incomplete base case
    if n == 0:
        return 0
    return fibonacci(n - 1) + fibonacci(n - 2)

print(fibonacci(5))`,
  },
  {
    label: "resource_leak",
    code: `def process_records(filepath):
    # Resource leak without with-statement + shadows built-in 'sum'
    f = open(filepath, "r")
    sum = 0
    for line in f:
        sum += len(line)
    return sum`,
  },
];
