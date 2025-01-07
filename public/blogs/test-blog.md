# Test Blog

This is a test blog post. Yay!

## Markdown Testing

- This is a list item
- This is another list item

1. This is an ordered list item
2. This is another ordered list item

This is **bold**, this is *italic*, and this is ***bold italic***.

[This is a link](https://www.google.com)

This is a code block:

```ts
const test = 'test';
console.log(test);

type Type = {
    thing?: any;
}

function test(test_param: Type): Omit<Type, "thing"> {
    delete test_param.thing;

    return test_param;
}

test({thing: 'thing'});
```

> This is a blockquote

> [!NOTE]
> This is a note block

This is ~subscript~ and this is ^superscript^

This is a horizontal rule:

---

This is a table:

| Col 1 | Col 2 |
|-------|-------|
| 1     | 2     |
| 3     | 4     |

This is an inline code block: `const test = 'test';`

This is an image:

![This is an image](https://pbs.twimg.com/media/GgYaMMTXUAA218q?format=jpg&name=small)

# Headers
## Headers
### Headers