export interface TestSample {
  id: string;
  name: string;
  description: string;
  category: "Math" | "Strings" | "Data Structures" | "Classes" | "Validation";
  code: string;
}

export const TEST_SAMPLES: TestSample[] = [
  {
    id: "math_calculator",
    name: "Math Calculator",
    category: "Math",
    description: "Functions for add, subtract, and divide with zero-division validation.",
    code: `def add(a: float, b: float) -> float:
    """Adds two numbers together."""
    return a + b

def subtract(a: float, b: float) -> float:
    """Subtracts b from a."""
    return a - b

def divide(a: float, b: float) -> float:
    """Divides a by b. Raises ValueError if b is zero."""
    if b == 0:
        raise ValueError("Cannot divide by zero")
    return a / b
`,
  },
  {
    id: "palindrome_detector",
    name: "Palindrome Detector",
    category: "Strings",
    description: "String processing with case normalization and boundary checks.",
    code: `def is_palindrome(text: str) -> bool:
    """Checks whether text is a palindrome, ignoring case and spaces."""
    if not isinstance(text, str):
        raise TypeError("Input must be a string")
    cleaned = "".join(ch.lower() for ch in text if ch.isalnum())
    if len(cleaned) == 0:
        return True
    return cleaned == cleaned[::-1]
`,
  },
  {
    id: "binary_search",
    name: "Binary Search",
    category: "Data Structures",
    description: "Classic logarithmic search with boundary indices and empty list handling.",
    code: `from typing import List, Optional

def binary_search(arr: List[int], target: int) -> Optional[int]:
    """Finds the index of target in sorted arr, or returns None."""
    if not arr:
        return None
    left, right = 0, len(arr) - 1
    while left <= right:
        mid = (left + right) // 2
        if arr[mid] == target:
            return mid
        elif arr[mid] < target:
            left = mid + 1
        else:
            right = mid - 1
    return None
`,
  },
  {
    id: "bank_account",
    name: "Bank Account Class",
    category: "Classes",
    description: "Object-oriented class with balance management and custom exceptions.",
    code: `class BankAccount:
    """Represents a customer bank account with balance tracking."""

    def __init__(self, owner: str, initial_balance: float = 0.0):
        if initial_balance < 0:
            raise ValueError("Initial balance cannot be negative")
        self.owner = owner
        self.balance = float(initial_balance)

    def deposit(self, amount: float) -> float:
        """Deposits funds into the account."""
        if amount <= 0:
            raise ValueError("Deposit amount must be positive")
        self.balance += amount
        return self.balance

    def withdraw(self, amount: float) -> float:
        """Withdraws funds if balance is sufficient."""
        if amount <= 0:
            raise ValueError("Withdrawal amount must be positive")
        if amount > self.balance:
            raise ValueError("Insufficient funds")
        self.balance -= amount
        return self.balance
`,
  },
  {
    id: "user_validator",
    name: "User Age & Email Validator",
    category: "Validation",
    description: "Input validator ensuring boundaries for age and format of email address.",
    code: `def validate_user(username: str, age: int, email: str) -> dict:
    """Validates user account data and returns normalized record."""
    if not username or len(username.strip()) < 3:
        raise ValueError("Username must be at least 3 characters")
    if age < 0 or age > 150:
        raise ValueError("Age must be between 0 and 150")
    if "@" not in email or "." not in email:
        raise ValueError("Invalid email format")
    return {
        "username": username.strip(),
        "age": age,
        "email": email.strip().lower()
    }
`,
  },
  {
    id: "buggy_divider",
    name: "Buggy Divider (For Fix Demo)",
    category: "Math",
    description: "Demonstrates test failure and automatic bug fixing suggestion.",
    code: `def divide(a: float, b: float) -> float:
    # BUG: Missing zero check before division
    return a / b

def add(a: float, b: float) -> float:
    # BUG: Uses subtraction instead of addition
    return a - b
`,
  },
];
