# Hello world, this is iris-utilities!

## Contributing

When contributing to I.R.I.S. Utilities, please follow these guidelines:

0. Demonstrate the [Code of Conduct](CODE_OF_CONDUCT.md).
1. Open an issue before opening a pull request (unless for bug fixes, security patches, grammatical corrections, or simple changes).
2. Keep your pull request short and simple. Try not to include unrelated or biased changes.
3. Maintain compatibility with the [License](LICENSE.md).
4. Follow the [Code Style Guide](#code-style-guide).

### Code Style Guide

#### Type, Interface, Enum, and Class names.

```ts
type ExampleType = {};

interface ExampleInterface {}

enum ExampleEnum {}

class ExampleClass {}
```

#### Function, methods, and lambda names.

```ts
function exampleFunction() {}

class ExampleClass {
    exampleMethod() {}
}

const exampleLambda = () => {};
```

#### Variable and Property names.

```ts
enum ExampleEnum {
    ExampleKey,
}

const example_variable = {};

class ExampleClass {
    static ExampleEnum = ExampleEnum;

    static example_property = {};
}
```

#### Comments.

```ts
// Single-line comment.

/* Single-line comment. */

// Multi-line
// comment.

/**
 * Multi-line
 * comment.
 */
```

#### Whitespace, Indentation, and Newlines.

```ts
if (
    long_condition &&
    another_long_condition
) {
    // ...
}

type ExampleTupleType = [ number, string ];

const example_tuple_array: ExampleTupleType[] = [
    [ 1, 'one' ],
    [ 2, 'two' ],
    [ 3, 'three' ],
];
```
