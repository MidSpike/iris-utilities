# Hello world, this is iris-utilities!

## Contributing

When contributing to I.R.I.S. Utilities, please follow these guidelines:

0. Please follow the [Code of Conduct](CODE_OF_CONDUCT.md).
1. Open a new issue before submitting a pull request (unless when submitting a bug fix, security patch, grammatical correction, or simple change).
2. Keep your pull request short and to the point. Don't include unrelated or biased changes.
3. Don't include code that is not compatible with the current [License](LICENSE.md).
4. Please follow the [Code Style Guide](#code-style-guide).

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
const example_variable = {};

class ExampleClass {
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
    very_long_condition &&
    another_very_long_condition
) {
    // ...
}

const example_nested_array: [ number, string ][] = [
    [ 1, 'one' ],
    [ 2, 'two' ],
    [ 3, 'three' ],
];
```
