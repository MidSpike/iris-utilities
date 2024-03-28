# Hello world, this is iris-utilities!

## Contributing

When contributing to I.R.I.S. Utilities, please follow these guidelines:

0. Demonstrate the [Code of Conduct](CODE_OF_CONDUCT.md).
1. Open an issue before opening a pull request (unless for bug fixes, security patches, grammatical corrections, or simple changes).
2. Keep your pull request short and simple. Try to not include unrelated or biased changes.
3. Maintain compatibility with the [License](LICENSE.md).
4. Follow the [Code Style Guide](#code-style-guide).

### Code Style Guide

#### Implicit returns.

```rust
fn example_function() -> String {
    // note the lack of a semicolon and `return` keyword
    "example".to_string()
}
```

#### Short chains and long chains.

```rust
// note how the entire chain fits on one line
let result = short_function().short_method().await;

// note how the first method call starts on the next line
// and how `.await` is on the same line as the method call
let result =
    long_function()
    .long_method().await
    .do_something().await;
```

#### Types, enums, structs.

```rust
type ExampleType = i32;

enum ExampleEnum {
    ExampleKey,
}

struct ExampleStruct {}
```

#### Functions, methods, and lambdas.

```rust
fn example_function(
    example_parameter: ExampleType,
) -> ExampleType {
    example_parameter
}

impl ExampleStruct {
    fn example_method(
        &self,
        example_parameter: ExampleType,
    ) -> ExampleType {
        example_parameter
    }
}

let example_lambda = |condition: bool| -> i32 {
    if condition {
        1
    } else {
        0
    }
};
```

#### Variables and properties.

```rust
const EXAMPLE_CONSTANT: i32 = 1;

let example_variable = 1;

struct ExampleStruct {
    example_property: i32,
}
```

#### Comments.

```rust
// Single-line comment.

// Multi-line
// comment.

/// Documentation comment.
/// This is a documentation comment.
```

#### Whitespace, indentation, and newlines.

```ts
if
    long_condition &&
    another_long_condition
{
    // Indentation is 4 spaces.
    // Braces are on the same line.
}
```
