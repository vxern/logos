## Style Guidelines

- Use <u>British English</u> spelling for everything other than string keys (localisations), special `custom_id`s, as well as property names in objects stored or transferred out of Logos. This would include database documents and Redis entries. 
- Use `===` for equality checks. Do not use `==` as it is less strict.
- Use `??` for coalescing values. Do not use `||` as it is less strict.
- Use `value === undefined` over `!value`, similarly use `value !== undefined` over `!!value`.
- Use `undefined` over `null`.
  - `null` is permitted when making the distinction between "no value" (`undefined`) and "remove this value" (`null`).
- Use `#` for declaring private API members. Do not use TypeScript's `public`, `protected` and `private` keywords.
  - `private` is permitted for hiding constructors.
- Use `return undefined;` over `return;` when the return type can be `undefined`.
