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
                data[j], data[j + 1] = data[j + 1], data[j]
    return data

print(bubble_sort([5, 3, 8, 1]))`,
  },
];
