# agents.md

## ai usage policy

ai is **allowed** in this repository, but with clear boundaries so this project does not slop itself.

### what ai is not for

- refactoring entire systems or large subsystems
- building new features or components from scratch entirely through ai
- padding contribution history: do not use ai just to have something to commit!!

### what ai is for

we use ai as a tool to assist contributors who already understand what they're doing. it's acceptable for:

- filling in boilerplate that follows an established pattern
- generating a first draft of something the contributor then reviews and edits
- helping debug or reason through a specific problem
- writing repetitive or mechanical code the contributor could write themselves

however, we want AI to STRICTLY be a tool, not to be used all throughout.

### requirements for ai-generated code

1. **you must understand it.** if you cannot explain every line of ai-generated code in a review, it should not be in the codebase. ai is not a substitute for understanding...

2. **it must be marked.** all ai-generated code must be wrapped with the following comments, including a date and timestamp:

```
// Generated code starts here on [DATE-TIMESTAMP]:

// Generated code ends here on [DATE-TIMESTAMP]:
```

example:

```js
// Generated code starts here on 2026-06-08T14:32:00Z:
function debounce(fn, delay) {
  let timer;
  return (...args) => {
    clearTimeout(timer);
    timer = setTimeout(() => fn(...args), delay);
  };
}
// Generated code ends here on 2026-06-08T14:32:00Z:
```

3. **it must fit.** ai-generated code should match the style, conventions, and architecture of the surrounding code. if it doesn't, fix it before committing!

### tl;dr

ai-assisted is fine. ai-driven is not. understand what you're committing.
