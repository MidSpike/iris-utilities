## Contributing

### Development Environment
- Windows ^v10.2004
- Node.js ^v14.11.0
- NPM ^7.0.5

### Using Experimental ECMAScript Features
- nullish coalescing `yin ?? yang`
- optional chaining `foo?.bar`
- private class field declarations `this.#private_thing`
- numeric separators `const large_number = 1_000_000_000_000;`

### Code Style Guidelines
- Try to match what already exists please
- ``' | ` | "`` should always be escaped inside of strings
- Don't use `var`; use `const` or `let` instead
- Only use `this` inside of classes
- snake_case for variables and long functions
- camelCase for short functions
- PascalCase for classes

### Commenting
- JSDoc comments for readability
- Other kinds of comments where applicable